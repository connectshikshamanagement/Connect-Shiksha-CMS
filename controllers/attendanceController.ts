import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Attendance, { AttendanceDocument, AttendanceStatus } from '../models/Attendance';
import AttendanceLog from '../models/AttendanceLog';
import Project from '../models/Project';
import User from '../models/User';
import Team from '../models/Team';
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
  const project = await Project.findById(projectId).select('projectMembers ownerId teamId location');
  if (!project) {
    throw new Error('Project not found');
  }

  const isOwner = project.ownerId
    ? project.ownerId.toString() === userId.toString()
    : false;

  const isMember =
    project.projectMembers?.some((member: mongoose.Types.ObjectId) =>
      member.equals(userId)
    ) || false;

  let hasTeamAccess = false;
  if (!isOwner && !isMember && project.teamId) {
    const team = await Team.findById(project.teamId).select('members leadUserId');
    if (team) {
      const isTeamMember = team.members?.some((member: mongoose.Types.ObjectId) =>
        member.equals(userId)
      );
      const isTeamLead = team.leadUserId
        ? team.leadUserId.toString() === userId.toString()
        : false;
      hasTeamAccess = Boolean(isTeamMember || isTeamLead);
    }
  }

  if (!isOwner && !isMember && !hasTeamAccess) {
    throw new Error('User is not assigned to this project');
  }

  return { project, isOwner };
};

const normalizeLegacyStatuses = async (
  records: Array<{ _id: mongoose.Types.ObjectId; status: string }>
) => {
  const legacyRecords = records.filter((record) => record.status === 'PENDING_ADMIN');
  if (!legacyRecords.length) {
    return;
  }

  const legacyIds = legacyRecords.map((record) => record._id);
  await Attendance.updateMany(
    { _id: { $in: legacyIds } },
    { status: 'APPROVED' }
  );

  legacyRecords.forEach((record) => {
    record.status = 'APPROVED';
  });
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
      location: submittedLocation,
      remarks
    } = (req.body as any) || {};

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project is required'
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(req.user._id);
    let accessInfo;
    try {
      accessInfo = await ensureProjectAccess(userObjectId, projectId);
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: err instanceof Error ? err.message : 'Access denied'
      });
    }
    const { project, isOwner: isProjectOwner } = accessInfo;

    let locationPayload = submittedLocation;

    if (
      !locationPayload &&
      project.location?.coordinates?.lat &&
      project.location?.coordinates?.lng
    ) {
      locationPayload = {
        lat: project.location.coordinates.lat,
        lng: project.location.coordinates.lng,
        accuracyMeters: project.location.radiusMeters
      };
    }

    if (
      locationPayload &&
      project.location?.coordinates?.lat &&
      project.location?.coordinates?.lng
    ) {
      const projectRadius = project.location.radiusMeters || 100;
      const distance = calculateDistanceMeters(
        locationPayload.lat,
        locationPayload.lng,
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
      const isApprovedOrRejected = attendance.status === 'APPROVED' || attendance.status === 'REJECTED';
      if (isApprovedOrRejected && !isProjectOwner) {
        return res.status(409).json({
          success: false,
          message: 'Attendance already finalized for this date'
        });
      }

      attendance.checkInTime = checkInTime ? new Date(checkInTime) : attendance.checkInTime;
      attendance.checkOutTime = checkOutTime ? new Date(checkOutTime) : attendance.checkOutTime;
      if (locationPayload) {
        attendance.location = locationPayload;
      }
      attendance.remarks = remarks || attendance.remarks;
      if (isProjectOwner) {
        attendance.status = 'APPROVED';
        attendance.verifiedBy = userObjectId as any;
      }

      await attendance.save();

      await createLog(
        attendance._id as mongoose.Types.ObjectId,
        userObjectId,
        'COMMENT',
        attendance.status,
        attendance.status,
        'Attendance updated by member',
        {
          location: locationPayload
        }
      );

      return res.status(200).json({
        success: true,
        data: attendance,
        message: 'Attendance updated'
      });
    }

    const initialStatus: AttendanceStatus = isProjectOwner ? 'APPROVED' : 'PENDING_MANAGER';
    const attendanceData: any = {
      userId: userObjectId,
      projectId,
      date: attendanceDate,
      checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
      checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
      status: initialStatus,
      verifiedBy: isProjectOwner ? (userObjectId as any) : undefined,
      managerRemarks: isProjectOwner ? 'Auto-approved by project manager' : undefined,
      remarks
    };

    if (locationPayload) {
      attendanceData.location = locationPayload;
    }

    attendance = await Attendance.create(attendanceData);

    await createLog(
      attendance._id as mongoose.Types.ObjectId,
      userObjectId,
      'CREATE',
      undefined,
      initialStatus,
      remarks,
      {
        location: locationPayload
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

export const managerMarkAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const roleInfo = await getUserRoleInfo(req.user._id);
    if (!roleInfo?.isProjectManager && !roleInfo?.isFounder) {
      return res.status(403).json({
        success: false,
        message: 'Only project managers or founders can perform this action.'
      });
    }

    const { memberId, projectId, checkInTime, checkOutTime, remarks } = (req.body as any) || {};

    if (!memberId || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'Member and project are required'
      });
    }

    const memberObjectId = new mongoose.Types.ObjectId(String(memberId));
    const { project } = await ensureProjectAccess(memberObjectId, projectId);

    if (!roleInfo.isFounder) {
      const ownsProject = project.ownerId
        ? project.ownerId.toString() === String(req.user._id)
        : false;
      if (!ownsProject) {
        return res.status(403).json({
          success: false,
          message: 'You can only update attendance for your own projects.'
        });
      }
    }

    const attendanceDate = normalizeDate(checkInTime || new Date());
    let attendance = await Attendance.findOne({
      userId: memberObjectId,
      projectId,
      date: attendanceDate
    });

    const approvedRemarks = remarks || 'Attendance recorded manually by project manager';
    const verifyActorId = new mongoose.Types.ObjectId(String(req.user._id));

    if (attendance) {
      attendance.checkInTime = checkInTime ? new Date(checkInTime) : attendance.checkInTime || new Date();
      attendance.checkOutTime = checkOutTime ? new Date(checkOutTime) : attendance.checkOutTime;
      attendance.remarks = remarks || attendance.remarks;
      attendance.managerRemarks = approvedRemarks;
      attendance.status = 'APPROVED';
      attendance.verifiedBy = verifyActorId as any;
      await attendance.save();

      await createLog(
        attendance._id as mongoose.Types.ObjectId,
        verifyActorId,
        'UPDATE_STATUS',
        'PENDING_MANAGER',
        'APPROVED',
        approvedRemarks
      );

      return res.status(200).json({
        success: true,
        data: attendance
      });
    }

    attendance = await Attendance.create({
      userId: memberObjectId,
      projectId,
      date: attendanceDate,
      checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
      checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
      status: 'APPROVED',
      verifiedBy: verifyActorId as any,
      managerRemarks: approvedRemarks,
      remarks
    });

    await createLog(
      attendance._id as mongoose.Types.ObjectId,
      verifyActorId,
      'CREATE',
      undefined,
      'APPROVED',
      approvedRemarks
    );

    return res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
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
      .sort({ date: -1 })
      .lean();

    await normalizeLegacyStatuses(attendance as Array<{ _id: mongoose.Types.ObjectId; status: string }>);

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
    if (!roleInfo?.isProjectManager && !roleInfo?.isFounder) {
      return res.status(403).json({
        success: false,
        message: 'Only project managers or founders can access team attendance.'
      });
    }

    const { month, year, status, projectId } = req.query as Record<string, string | undefined>;
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

    let accessibleProjectIds: string[] | null = null;
    if (projectId) {
      filters.projectId = projectId;
    }

    if (!roleInfo.isFounder) {
      const managedProjects = await Project.find({ ownerId: req.user._id }).select('_id');
      const managedIds = managedProjects.map((proj) => proj._id.toString());

      if (!managedIds.length) {
        return res.status(200).json({
          success: true,
          data: []
        });
      }

      accessibleProjectIds = managedIds;

      if (projectId) {
        if (!managedIds.includes(projectId)) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to view attendance for this project.'
          });
        }
      } else {
        filters.projectId = { $in: managedIds };
      }
    }

    const attendance = await Attendance.find(filters)
      .populate('userId', 'name email roleIds')
      .populate('projectId', 'title teamId location projectMembers')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    await normalizeLegacyStatuses(attendance as Array<{ _id: mongoose.Types.ObjectId; status: string }>);

    let projectMembers: Array<{ _id: string; name: string; email?: string }> | undefined;
    if (projectId || accessibleProjectIds?.length) {
      const filterIds =
        projectId && projectId.length
          ? [new mongoose.Types.ObjectId(projectId)]
          : (accessibleProjectIds || []).map((id) => new mongoose.Types.ObjectId(id));

      if (filterIds.length) {
        const projects = await Project.find({ _id: { $in: filterIds } })
          .populate('projectMembers', 'name email')
          .lean();

        const membersMap = new Map<string, { _id: string; name: string; email?: string }>();
        projects?.forEach((projectDoc) => {
          (projectDoc.projectMembers || []).forEach((member: any) => {
            if (!membersMap.has(member._id.toString())) {
              membersMap.set(member._id.toString(), {
                _id: member._id.toString(),
                name: member.name || member.email || 'Unnamed member',
                email: member.email
              });
            }
          });
        });

        projectMembers = Array.from(membersMap.values());
      }
    }

    return res.status(200).json({
      success: true,
      data: attendance,
      projectMembers
    });
  } catch (error) {
    next(error);
  }
};

const transitionStatus = async (
  attendance: AttendanceDocument,
  newStatus: AttendanceStatus,
  actorId: mongoose.Types.ObjectId,
  remarks?: string
) => {
  const previousStatus = attendance.status;
  attendance.status = newStatus;
  attendance.verifiedBy = actorId as any;
  attendance.managerRemarks = remarks;

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
    if (!roleInfo?.isProjectManager && !roleInfo?.isFounder) {
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

    const project = await Project.findById(attendance.projectId).select('ownerId title');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!roleInfo.isFounder) {
      const ownsProject = project.ownerId
        ? project.ownerId.toString() === String(req.user._id)
        : false;
      if (!ownsProject) {
        return res.status(403).json({
          success: false,
          message: 'You can only manage attendance for your own projects.'
        });
      }
    }

    if (attendance.status !== 'PENDING_MANAGER') {
      return res.status(400).json({
        success: false,
        message: 'Attendance already reviewed by manager'
      });
    }

    const newStatus: AttendanceStatus = approve ? 'APPROVED' : 'REJECTED';
    const actorId = new mongoose.Types.ObjectId(String(req.user._id));
    await transitionStatus(attendance, newStatus, actorId, remarks);

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

