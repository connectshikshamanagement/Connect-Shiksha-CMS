const express = require('express');
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  refresh,
  logout,
  setPassword,
  getTeamCodes
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const cookieParser = require('cookie-parser');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

router.use(cookieParser());

router.post('/register', validate(schemas.userCreate), register);
router.post('/login', authLimiter, validate(schemas.authLogin), login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', authLimiter, logout);
router.get('/teamcodes', getTeamCodes);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, validate(schemas.userUpdate), updateDetails);
router.put('/updatepassword', protect, validate(schemas.passwordUpdate), updatePassword);
router.put('/setpassword', protect, validate(schemas.passwordSet), setPassword);

module.exports = router;

