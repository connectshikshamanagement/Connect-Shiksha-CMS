const express = require('express');
const { createController } = require('../controllers/genericController');
const Role = require('../models/Role');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const roleController = createController(Role);

router.use(protect);

router
  .route('/')
  .get(roleController.getAll)
  .post(authorize('users.create'), roleController.create);

router
  .route('/:id')
  .get(roleController.getOne)
  .put(authorize('users.update'), roleController.update)
  .delete(authorize('users.delete'), roleController.delete);

module.exports = router;

