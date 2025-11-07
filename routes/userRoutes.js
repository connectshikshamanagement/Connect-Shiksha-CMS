const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  backfillTeamCodes
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

// Get current user data
router.get('/me', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).populate('roleIds');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router
  .route('/')
  .get(getUsers)
  .post(authorize('users.create'), createUser);

// Backfill team codes for existing users (admin only)
router.post('/backfill-teamcodes', authorize('users.update'), backfillTeamCodes);

router
  .route('/:id')
  .get(getUser)
  .put(authorize('users.update'), updateUser)
  .delete(authorize('users.delete'), deleteUser);

module.exports = router;

