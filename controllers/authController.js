const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const {
  getSignedJwtToken,
  generateRawRefreshToken,
  hashToken,
  compareTokenHash
} = require('../middleware/auth');
const crypto = require('crypto');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, roleIds, salary } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash: password,
      roleIds: roleIds || [],
      salary: salary || 0
    });

    // Generate token
    const token = getSignedJwtToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          roleIds: user.roleIds,
          salary: user.salary,
          active: user.active,
          teamCode: user.teamCode
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, teamCode, password } = req.body;

    // Validate email & password
    if ((!email && !teamCode) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide team code or email and password'
      });
    }

    // Check for user
    const query = email ? { email } : { teamCode };
    const user = await User.findOne(query).select('+passwordHash').populate('roleIds');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Issue access + refresh tokens
    const accessToken = getSignedJwtToken(user._id);
    const rawRefresh = generateRawRefreshToken();
    const refreshHash = await hashToken(rawRefresh);
    const family = crypto.randomUUID();
    const expiresDays = parseInt(process.env.REFRESH_TOKEN_DAYS || '30', 10);
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: refreshHash,
      family,
      expiresAt,
      userAgent: req.get('user-agent'),
      ip: req.ip
    });

    // Set refresh token as httpOnly cookie (secure in production)
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      path: '/api/auth'
    };
    res.cookie('refreshToken', `${family}:${rawRefresh}`, cookieOptions);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          roleIds: user.roleIds,
          salary: user.salary,
          active: user.active,
          profilePicture: user.profilePicture,
          teamCode: user.teamCode
        },
        accessToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('roleIds');

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
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      emergencyContact: req.body.emergencyContact
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

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
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+passwordHash');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    user.passwordHash = req.body.newPassword;
    await user.save();

    const token = getSignedJwtToken(user._id);

    res.status(200).json({
      success: true,
      data: { token }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Set password without current password (allowed by requirement)
// @route   PUT /api/auth/setpassword
// @access  Private
exports.setPassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.passwordHash = req.body.newPassword;
    await user.save();
    const token = getSignedJwtToken(user._id);
    return res.status(200).json({ success: true, data: { token } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all team codes for login dropdown
// @route   GET /api/auth/teamcodes
// @access  Public
exports.getTeamCodes = async (req, res) => {
  try {
    const users = await User.find({}, { teamCode: 1, name: 1, _id: 0 }).sort({ teamCode: 1 });
    const list = users
      .filter(u => !!u.teamCode)
      .map(u => ({ teamCode: u.teamCode, name: u.name }));
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Refresh access token with rotation
// @route   POST /api/auth/refresh
// @access  Public (cookie required)
exports.refresh = async (req, res) => {
  try {
    const cookie = req.cookies?.refreshToken;
    if (!cookie) {
      return res.status(401).json({ success: false, message: 'Missing refresh token' });
    }

    const [family, rawToken] = cookie.split(':');
    if (!family || !rawToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Find active token in this family
    const existingTokens = await RefreshToken.find({ family, revokedAt: { $exists: false } }).sort({ createdAt: -1 });
    if (existingTokens.length === 0) {
      return res.status(401).json({ success: false, message: 'Refresh token family revoked' });
    }

    const latest = existingTokens[0];
    const valid = await compareTokenHash(rawToken, latest.tokenHash);

    if (!valid || latest.expiresAt < new Date()) {
      // Token reuse or expired: revoke entire family
      await RefreshToken.updateMany({ family, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });
    }

    // Rotate token
    const newRaw = generateRawRefreshToken();
    const newHash = await hashToken(newRaw);
    const expiresDays = parseInt(process.env.REFRESH_TOKEN_DAYS || '30', 10);
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);

    latest.replacedByTokenHash = newHash;
    latest.revokedAt = new Date();
    await latest.save();

    const replacement = await RefreshToken.create({
      userId: latest.userId,
      tokenHash: newHash,
      family,
      expiresAt,
      userAgent: req.get('user-agent'),
      ip: req.ip
    });

    const accessToken = getSignedJwtToken(latest.userId);

    // Set new cookie
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      path: '/api/auth'
    };
    res.cookie('refreshToken', `${family}:${newRaw}`, cookieOptions);

    return res.status(200).json({ success: true, data: { accessToken } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Logout and revoke refresh token family
// @route   POST /api/auth/logout
// @access  Public (cookie required)
exports.logout = async (req, res) => {
  try {
    const cookie = req.cookies?.refreshToken;
    if (cookie) {
      const [family] = cookie.split(':');
      if (family) {
        await RefreshToken.updateMany({ family, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
      }
    }
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

