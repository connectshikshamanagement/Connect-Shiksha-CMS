const Role = require('../models/Role');
const User = require('../models/User');

// Check if user has specific role
const hasRole = async (userId, roleKey) => {
  try {
    const user = await User.findById(userId).populate('roleIds');
    if (!user || !user.active) return false;
    
    return user.roleIds.some(role => role.key === roleKey);
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};

// Check if user has any of the specified roles
const hasAnyRole = async (userId, roleKeys) => {
  try {
    const user = await User.findById(userId).populate('roleIds');
    if (!user || !user.active) return false;
    
    const userRoleKeys = user.roleIds.map(role => role.key);
    return roleKeys.some(roleKey => userRoleKeys.includes(roleKey));
  } catch (error) {
    console.error('Error checking user roles:', error);
    return false;
  }
};

// Middleware to restrict access based on role
const restrictToRole = (roleKey) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasAccess = await hasRole(req.user.id, roleKey);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${roleKey}`
        });
      }

      next();
    } catch (error) {
      console.error('Role access middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Middleware to restrict access to multiple roles
const restrictToRoles = (roleKeys) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasAccess = await hasAnyRole(req.user.id, roleKeys);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${roleKeys.join(' or ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Role access middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Middleware to check if user can access team data
const canAccessTeam = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findById(req.user.id).populate('roleIds');
    if (!user || !user.active) {
      return res.status(403).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Founder has access to all teams
    const isFounder = user.roleIds.some(role => role.key === 'FOUNDER');
    if (isFounder) {
      req.userRole = 'FOUNDER';
      return next();
    }

    // Team Manager has access to their team only
    const isManager = user.roleIds.some(role => role.key === 'TEAM_MANAGER');
    if (isManager) {
      req.userRole = 'TEAM_MANAGER';
      req.userTeamId = user.teamHistory?.[user.teamHistory.length - 1]?.teamId;
      return next();
    }

    // Team Member has limited access
    const isMember = user.roleIds.some(role => role.key === 'TEAM_MEMBER');
    if (isMember) {
      req.userRole = 'TEAM_MEMBER';
      req.userTeamId = user.teamHistory?.[user.teamHistory.length - 1]?.teamId;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. Invalid role.'
    });

  } catch (error) {
    console.error('Team access middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Middleware to check if user can access project data
const canAccessProject = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findById(req.user.id).populate('roleIds');
    if (!user || !user.active) {
      return res.status(403).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
    
    // Founder has access to all projects
    const isFounder = user.roleIds.some(role => role.key === 'FOUNDER');
    if (isFounder) {
      req.userRole = 'FOUNDER';
      return next();
    }

    if (projectId) {
      const Project = require('../models/Project');
      const project = await Project.findById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Team Manager can access projects in their team
      const isManager = user.roleIds.some(role => role.key === 'TEAM_MANAGER');
      if (isManager && project.teamId.toString() === req.userTeamId?.toString()) {
        req.userRole = 'TEAM_MANAGER';
        return next();
      }

      // Team Member can access projects they're assigned to
      const isMember = user.roleIds.some(role => role.key === 'TEAM_MEMBER');
      if (isMember && project.projectMembers.includes(user._id)) {
        req.userRole = 'TEAM_MEMBER';
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient project permissions.'
    });

  } catch (error) {
    console.error('Project access middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user's role information
const getUserRoleInfo = async (userId) => {
  try {
    const user = await User.findById(userId).populate('roleIds');
    if (!user || !user.active) return null;

    const roles = user.roleIds.map(role => role.key);
    const isFounder = roles.includes('FOUNDER');
    const isManager = roles.includes('TEAM_MANAGER');
    const isMember = roles.includes('TEAM_MEMBER');

    return {
      userId,
      name: user.name,
      email: user.email,
      roles,
      isFounder,
      isManager,
      isMember,
      primaryRole: isFounder ? 'FOUNDER' : isManager ? 'TEAM_MANAGER' : isMember ? 'TEAM_MEMBER' : 'UNKNOWN'
    };
  } catch (error) {
    console.error('Error getting user role info:', error);
    return null;
  }
};

module.exports = {
  hasRole,
  hasAnyRole,
  restrictToRole,
  restrictToRoles,
  canAccessTeam,
  canAccessProject,
  getUserRoleInfo
};
