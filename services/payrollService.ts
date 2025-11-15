import { Parser } from 'json2csv';
import Attendance from '../models/Attendance';
import Project from '../models/Project';
import User from '../models/User';
import { getUserRoleInfo } from '../middleware/roleAccess';

const DEFAULT_TEAM_SHARE = Number(process.env.DEFAULT_TEAM_SHARE_PERCENT || 0.3);
const DEFAULT_EXPECTED_DAYS = Number(process.env.DEFAULT_EXPECTED_WORKING_DAYS || 22);
const MANAGER_MULTIPLIER = Number(process.env.MANAGER_ATTENDANCE_MULTIPLIER || 1.2);

export interface PayrollRecord {
  userId: string;
  userName: string;
  userEmail: string;
  projectId: string;
  projectTitle: string;
  month: number;
  year: number;
  workingDays: number;
  expectedDays: number;
  dailyRate: number;
  payoutBeforeMultiplier: number;
  multiplier: number;
  payout: number;
}

export interface PayrollSummary {
  month: number;
  year: number;
  totalPayout: number;
  records: PayrollRecord[];
}

const getDateRange = (month: number, year: number) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

export const calculateMonthlyPayroll = async (
  month: number,
  year: number
): Promise<PayrollSummary> => {
  const { start, end } = getDateRange(month, year);

  const attendanceAggregation = await Attendance.aggregate([
    {
      $match: {
        status: 'APPROVED',
        date: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: {
          userId: '$userId',
          projectId: '$projectId'
        },
        workingDays: { $sum: 1 }
      }
    }
  ]);

  const records: PayrollRecord[] = [];

  for (const entry of attendanceAggregation) {
    const { userId, projectId } = entry._id;
    const workingDays = entry.workingDays;

    const project = await Project.findById(projectId);
    if (!project) continue;

    const user = await User.findById(userId);
    if (!user) continue;

    const roleInfo = await getUserRoleInfo(userId.toString());

    const teamShare = project.teamProfitSharePercent || DEFAULT_TEAM_SHARE;
    const expectedDays = project.expectedWorkingDays || DEFAULT_EXPECTED_DAYS;
    const projectBudget =
      project.allocatedBudget && project.allocatedBudget > 0
        ? project.allocatedBudget
        : project.budget || 0;

    if (!projectBudget || expectedDays <= 0) {
      continue;
    }

    const dailyRate = (projectBudget * teamShare) / expectedDays;
    const cappedWorkingDays = Math.min(workingDays, expectedDays);
    const payoutBeforeMultiplier = cappedWorkingDays * dailyRate;
    const multiplier = roleInfo?.isProjectManager ? MANAGER_MULTIPLIER : 1;
    const payout = payoutBeforeMultiplier * multiplier;

    records.push({
      userId: userId.toString(),
      userName: user.name,
      userEmail: user.email,
      projectId: projectId.toString(),
      projectTitle: project.title,
      month,
      year,
      workingDays: cappedWorkingDays,
      expectedDays,
      dailyRate,
      payoutBeforeMultiplier,
      multiplier,
      payout
    });
  }

  const totalPayout = records.reduce((sum, record) => sum + record.payout, 0);

  return {
    month,
    year,
    totalPayout,
    records
  };
};

export const generateMonthlyPayrollCsv = async (month: number, year: number) => {
  const summary = await calculateMonthlyPayroll(month, year);
  if (!summary.records.length) {
    return 'userName,userEmail,projectTitle,month,year,workingDays,expectedDays,dailyRate,multiplier,payout\n';
  }

  const fields = [
    { label: 'User Name', value: 'userName' },
    { label: 'Email', value: 'userEmail' },
    { label: 'Project', value: 'projectTitle' },
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year' },
    { label: 'Working Days', value: 'workingDays' },
    { label: 'Expected Days', value: 'expectedDays' },
    { label: 'Daily Rate', value: (row: PayrollRecord) => row.dailyRate.toFixed(2) },
    { label: 'Multiplier', value: (row: PayrollRecord) => row.multiplier.toFixed(2) },
    { label: 'Payout', value: (row: PayrollRecord) => row.payout.toFixed(2) }
  ];

  const parser = new Parser({ fields });
  return parser.parse(summary.records);
};

