const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

router
  .route('/')
  .get(getUsers)
  .post(authorize('users.create'), createUser);

router
  .route('/:id')
  .get(getUser)
  .put(authorize('users.update'), updateUser)
  .delete(authorize('users.delete'), deleteUser);

module.exports = router;

