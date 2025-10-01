const express = require('express');
const { createController } = require('../controllers/genericController');
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const projectController = createController(Project);

router.use(protect);

router
  .route('/')
  .get(projectController.getAll)
  .post(authorize('projects.create'), projectController.create);

router
  .route('/:id')
  .get(projectController.getOne)
  .put(authorize('projects.update'), projectController.update)
  .delete(authorize('projects.delete'), projectController.delete);

module.exports = router;

