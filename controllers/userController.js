const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().populate('roleIds').select('-passwordHash');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Backfill teamCodes for users missing one (oldest first)
// @route   POST /api/users/backfill-teamcodes
// @access  Private (admin)
exports.backfillTeamCodes = async (req, res) => {
  try {
    // Fetch users without teamCode
    const usersWithout = await User.find({ $or: [ { teamCode: { $exists: false } }, { teamCode: null } ] }).sort({ createdAt: 1 });

    if (usersWithout.length === 0) {
      return res.status(200).json({ success: true, data: { assigned: 0 } });
    }

    // Collect used numbers from existing teamCodes
    const existing = await User.find({ teamCode: { $exists: true, $ne: null } }).select('teamCode');
    const used = new Set();
    for (const u of existing) {
      const m = /CSTeam(\d+)/.exec(u.teamCode || '');
      if (m) used.add(parseInt(m[1], 10) || 0);
    }

    let assignedCount = 0;
    let next = 1;
    // find first free slot
    while (used.has(next)) next++;

    for (const user of usersWithout) {
      // advance to next free number
      while (used.has(next)) next++;
      const code = `CSTeam${String(next).padStart(2, '0')}`;
      user.teamCode = code;
      await user.save();
      used.add(next);
      assignedCount++;
      next++;
    }

    return res.status(200).json({ success: true, data: { assigned: assignedCount } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('roleIds').select('-passwordHash');

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
};

// @desc    Create user
// @route   POST /api/users
// @access  Private
exports.createUser = async (req, res) => {
  try {
    const Role = require('../models/Role');
    
    // Extract password and convert to passwordHash for the model
    const { password, ...userData } = req.body;
    
    // If no roleIds provided, default to Team Member
    if (!userData.roleIds || userData.roleIds.length === 0) {
      const teamMemberRole = await Role.findOne({ key: 'TEAM_MEMBER' });
      if (teamMemberRole) {
        userData.roleIds = [teamMemberRole._id];
      }
    }
    
    const dataToSave = {
      ...userData,
      passwordHash: password || 'changeme123'
    };

    const user = await User.create(dataToSave);

    // Populate roleIds before sending response
    await user.populate('roleIds');

    res.status(201).json({
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

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('+passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const {
      password,
      roleIds,
      name,
      email,
      phone,
      salary,
      active,
      profilePicture,
      address,
      emergencyContact,
      bankDetails,
      joiningDate,
      teamCode
    } = req.body;

    if (typeof name !== 'undefined') user.name = name;
    if (typeof email !== 'undefined') user.email = email;
    if (typeof phone !== 'undefined') user.phone = phone;
    if (typeof salary !== 'undefined') user.salary = salary;
    if (typeof active !== 'undefined') user.active = active;
    if (typeof profilePicture !== 'undefined') user.profilePicture = profilePicture;
    if (typeof address !== 'undefined') user.address = address;
    if (typeof emergencyContact !== 'undefined') user.emergencyContact = emergencyContact;
    if (typeof bankDetails !== 'undefined') user.bankDetails = bankDetails;
    if (typeof joiningDate !== 'undefined') user.joiningDate = joiningDate;
    if (typeof teamCode !== 'undefined') user.teamCode = teamCode;

    if (Array.isArray(roleIds)) {
      user.roleIds = roleIds;
    }

    if (password) {
      user.passwordHash = password;
    }

    await user.save();
    await user.populate('roleIds');

    const userObj = user.toObject();
    delete userObj.passwordHash;

    res.status(200).json({
      success: true,
      data: userObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

