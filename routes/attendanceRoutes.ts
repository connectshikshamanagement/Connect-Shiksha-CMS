import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  markAttendance,
  managerMarkAttendance,
  getMyAttendance,
  getTeamAttendance,
  managerDecision,
  getAttendanceLogs
} from '../controllers/attendanceController';
import { restrictToRoles } from '../middleware/roleAccess';

const router = Router();

router.use(protect);

router.post('/', markAttendance);
router.get('/my', getMyAttendance);
router.post(
  '/manager',
  restrictToRoles(['PROJECT_MANAGER', 'FOUNDER']),
  managerMarkAttendance
);

router.get(
  '/team',
  restrictToRoles(['PROJECT_MANAGER', 'FOUNDER']),
  getTeamAttendance
);

router.patch(
  '/:id/manager',
  restrictToRoles(['PROJECT_MANAGER', 'FOUNDER']),
  managerDecision
);

router.get('/:id/logs', restrictToRoles(['PROJECT_MANAGER', 'FOUNDER']), getAttendanceLogs);

export default router;

