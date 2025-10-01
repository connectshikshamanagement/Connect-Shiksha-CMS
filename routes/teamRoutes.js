const express = require('express');
const { createController } = require('../controllers/genericController');
const Team = require('../models/Team');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const teamController = createController(Team);

router.use(protect);

router
  .route('/')
  .get(teamController.getAll)
  .post(authorize('teams.create'), teamController.create);

router
  .route('/:id')
  .get(teamController.getOne)
  .put(authorize('teams.update'), teamController.update)
  .delete(authorize('teams.delete'), teamController.delete);

module.exports = router;

