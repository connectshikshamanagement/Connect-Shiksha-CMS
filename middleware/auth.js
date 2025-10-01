const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).populate('roleIds');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!req.user.active) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Check permissions
exports.authorize = (...requiredPermissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const userRoles = req.user.roleIds;
    
    if (!userRoles || userRoles.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: No roles assigned'
      });
    }

    // Check if user has any of the required permissions
    let hasPermission = false;
    
    for (const role of userRoles) {
      for (const permission of requiredPermissions) {
        const [resource, action] = permission.split('.');
        
        if (role.permissions[resource] && role.permissions[resource][action]) {
          hasPermission = true;
          break;
        }
      }
      if (hasPermission) break;
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions'
      });
    }

    next();
  };
};

// Generate JWT Token
exports.getSignedJwtToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

