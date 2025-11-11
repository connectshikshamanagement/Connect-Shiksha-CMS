import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Attendance, { AttendanceDocument, AttendanceStatus } from '../models/Attendance';
import AttendanceLog from '../models/AttendanceLog';
import Project from '../models/Project';
import User from '../models/User';
import { calculateMonthlyPayroll, generateMonthlyPayrollCsv } from '../services/payrollService';
import { getUserRoleInfo } from '../middleware/roleAccess';

type AuthenticatedRequest = Request & { user?: any };

const EARTH_RADIUS_METERS = 6371000;

const calculateDistanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

const normalizeDate = (value: Date | string | undefined): Date => {
  const date = value ? new Date(value) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const createLog = async (
  attendanceId: mongoose.Types.ObjectId,
  actor: mongoose.Types.ObjectId,
  action: 'CREATE' | 'UPDATE_STATUS' | 'COMMENT',
  previousStatus?: AttendanceStatus,
  newStatus?: AttendanceStatus,
  remarks?: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  await AttendanceLog.create({
    attendanceId,
    actor,
    action,
    previousStatus,
    newStatus,
    remarks,
    metadata
  });
};

const ensureProjectAccess = async (
  userId: mongoose.Types.ObjectId,
  projectId: string
) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const isAssigned =
    project.projectMembers?.some((member: mongoose.Types.ObjectId) =>
      member.equals(userId)
    ) || false;

  if (!isAssigned) {
    throw new Error('User is not assigned to this project');
  }

  return project;
};

export const markAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      projectId,
      checkInTime,
      checkOutTime,
      location,
      qrCodeRef,
      remarks
    } = (req.body as any) || {};

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!projectId || !location?.lat || !location?.lng) {
      return res.status(400).json({
        success: false,
        message: 'Project, latitude and longitude are required'
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(req.user._id);
    let project;
    try {
      project = await ensureProjectAccess(userObjectId, projectId);
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: err instanceof Error ? err.message : 'Access denied'
      });
    }

    if (project.location?.coordinates?.lat && project.location?.coordinates?.lng) {
      const projectRadius = project.location.radiusMeters || 100;
      const distance = calculateDistanceMeters(
        location.lat,
        location.lng,
        project.location.coordinates.lat,
        project.location.coordinates.lng
      );
      if (distance > projectRadius) {
        return res.status(400).json({
          success: false,
          message: 'GPS validation failed. You are not at the project location.',
          meta: { distance }
        });
      }
    }

    const attendanceDate = normalizeDate(checkInTime || Date.now());

    let attendance = await Attendance.findOne({
      userId: userObjectId,
      projectId,
      date: attendanceDate
    });

    if (attendance) {
      if (['APPROVED', 'PENDING_ADMIN'].includes(attendance.status)) {
        return res.status(409).json({
          success: false,
          message: 'Attendance already submitted and pending approval'
        });
      }

      attendance.checkInTime = checkInTime ? new Date(checkInTime) : attendance.checkInTime;
      attendance.checkOutTime = checkOutTime ? new Date(checkOutTime) : attendance.checkOutTime;
      attendance.location = location;
      attendance.qrCodeRef = qrCodeRef || attendance.qrCodeRef;
      attendance.remarks = remarks || attendance.remarks;

      await attendance.save();

      await createLog(
        attendance._id as mongoose.Types.ObjectId,
        userObjectId,
        'COMMENT',
        attendance.status,
        attendance.status,
        'Attendance updated by member',
        {
          location,
          qrCodeRef
        }
      );

      return res.status(200).json({
        success: true,
        data: attendance,
        message: 'Attendance updated'
      });
    }

    attendance = await Attendance.create({
      userId: userObjectId,
      projectId,
      date: attendanceDate,
      checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
      checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
      location,
      qrCodeRef,
      status: 'PENDING_MANAGER',
      remarks
    });

    await createLog(
      attendance._id as mongoose.Types.ObjectId,
      userObjectId,
      'CREATE',
      undefined,
      'PENDING_MANAGER',
      remarks,
      {
        location,
        qrCodeRef
      }
    );

    return res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError || (error as any).code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already exists for this date',
        error
      });
    }
    next(error);
  }
};

export const getMyAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { month, year, projectId } = req.query as Record<string, string | undefined>;
    const startDate =
      month && year
        ? new Date(Number(year), Number(month) - 1, 1)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const filters: Record<string, unknown> = {
      userId: req.user._id,
      date: { $gte: startDate, $lt: endDate }
    };

    if (projectId) {
      filters.projectId = projectId;
    }

    const attendance = await Attendance.find(filters)
      .populate('projectId', 'title teamProfitSharePercent expectedWorkingDays location')
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

export const getTeamAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const roleInfo = await getUserRoleInfo(req.user._id);
    if (!roleInfo?.isManager && !roleInfo?.isFounder) {
      return res.status(403).json({
        success: false,
        message: 'Only managers or admins can access team attendance.'
      });
    }

    const { month, year, status } = req.query as Record<string, string | undefined>;
    const startDate =
      month && year
        ? new Date(Number(year), Number(month) - 1, 1)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const filters: Record<string, unknown> = {
      date: { $gte: startDate, $lt: endDate }
    };

    if (status) {
      filters.status = status;
    }

    const attendance = await Attendance.find(filters)
      .populate('userId', 'name email roleIds')
      .populate('projectId', 'title teamId location')
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

const transitionStatus = async (
  attendance: AttendanceDocument,
  newStatus: AttendanceStatus,
  actorId: mongoose.Types.ObjectId,
  remarks?: string,
  role: 'manager' | 'admin' = 'manager'
) => {
  const previousStatus = attendance.status;
  attendance.status = newStatus;
  attendance.verifiedBy = actorId as any;

  if (role === 'manager') {
    attendance.managerRemarks = remarks;
  } else {
    attendance.adminRemarks = remarks;
  }

  await attendance.save();
  await createLog(
    attendance._id as mongoose.Types.ObjectId,
    actorId,
    'UPDATE_STATUS',
    previousStatus,
    attendance.status,
    remarks
  );
};

export const managerDecision = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const roleInfo = await getUserRoleInfo(req.user._id);
    if (!roleInfo?.isManager && !roleInfo?.isFounder) {
      return res.status(403).json({
        success: false,
        message: 'Only team managers can perform this action.'
      });
    }

    const { id } = req.params as { id: string };
    const { approve, remarks } = req.body as { approve: boolean; remarks?: string };

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance not found' });
    }

    if (attendance.status !== 'PENDING_MANAGER') {
      return res.status(400).json({
        success: false,
        message: 'Attendance already reviewed by manager'
      });
    }

    const newStatus: AttendanceStatus = approve ? 'PENDING_ADMIN' : 'REJECTED';
    const actorId = new mongoose.Types.ObjectId(String(req.user._id));
    await transitionStatus(attendance, newStatus, actorId, remarks, 'manager');

    return res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

export const adminDecision = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const roleInfo = await getUserRoleInfo(req.user._id);
    if (!roleInfo?.isFounder) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can perform this action.'
      });
    }

    const { id } = req.params as { id: string };
    const { approve, remarks } = req.body as { approve: boolean; remarks?: string };

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance not found' });
    }

    if (!['PENDING_ADMIN', 'REJECTED'].includes(attendance.status)) {
      return res.status(400).json({
        success: false,
        message: 'Attendance is not pending admin approval'
      });
    }

    const newStatus: AttendanceStatus = approve ? 'APPROVED' : 'REJECTED';
    const actorId = new mongoose.Types.ObjectId(String(req.user._id));
    await transitionStatus(attendance, newStatus, actorId, remarks, 'admin');

    return res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const logs = await AttendanceLog.find({ attendanceId: id })
      .populate('actor', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

export const getPayrollSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const summary = await calculateMonthlyPayroll(month, year);

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

export const downloadPayrollCsv = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const csv = await generateMonthlyPayrollCsv(month, year);
    const filename = `attendance-payroll-${year}-${month.toString().padStart(2, '0')}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

