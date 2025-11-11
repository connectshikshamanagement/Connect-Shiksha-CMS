import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  markAttendance,
  getMyAttendance,
  getTeamAttendance,
  managerDecision,
  adminDecision,
  getAttendanceLogs,
  getPayrollSummary,
  downloadPayrollCsv
} from '../controllers/attendanceController';
import { restrictToRoles } from '../middleware/roleAccess';

const router = Router();

router.use(protect);

router.post('/', markAttendance);
router.get('/my', getMyAttendance);

router.get(
  '/team',
  restrictToRoles(['TEAM_MANAGER', 'FOUNDER']),
  getTeamAttendance
);

router.patch(
  '/:id/manager',
  restrictToRoles(['TEAM_MANAGER', 'FOUNDER']),
  managerDecision
);

router.patch('/:id/admin', restrictToRoles(['FOUNDER']), adminDecision);
router.get('/:id/logs', restrictToRoles(['TEAM_MANAGER', 'FOUNDER']), getAttendanceLogs);

router.get(
  '/payroll/summary',
  restrictToRoles(['TEAM_MANAGER', 'FOUNDER']),
  getPayrollSummary
);

router.get(
  '/payroll/summary.csv',
  restrictToRoles(['TEAM_MANAGER', 'FOUNDER']),
  downloadPayrollCsv
);

export default router;

