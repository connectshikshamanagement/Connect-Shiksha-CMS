const express = require('express');
const { createController } = require('../controllers/genericController');
const Attendance = require('../models/Attendance');
const { protect } = require('../middleware/auth');

const router = express.Router();
const attendanceController = createController(Attendance);

router.use(protect);

router
  .route('/')
  .get(attendanceController.getAll)
  .post(attendanceController.create);

router
  .route('/:id')
  .get(attendanceController.getOne)
  .put(attendanceController.update)
  .delete(attendanceController.delete);

module.exports = router;

