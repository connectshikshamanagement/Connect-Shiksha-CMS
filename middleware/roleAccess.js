const Role = require('../models/Role');
const User = require('../models/User');

// Check if user has specific role
const ROLE_KEYS = {
  FOUNDER: 'FOUNDER',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  TEAM_MANAGER: 'TEAM_MANAGER', // legacy name, kept for backward compatibility
  TEAM_MEMBER: 'TEAM_MEMBER'
};

const PROJECT_MANAGER_KEYS = [ROLE_KEYS.PROJECT_MANAGER, ROLE_KEYS.TEAM_MANAGER];

const normalizeRoleKey = (roleKey = '') => {
  if (!roleKey) return roleKey;
  return PROJECT_MANAGER_KEYS.includes(roleKey) ? ROLE_KEYS.PROJECT_MANAGER : roleKey;
};

const isProjectManagerRole = (roleKey = '') => PROJECT_MANAGER_KEYS.includes(roleKey);

const hasRole = async (userId, roleKey) => {
  try {
    const user = await User.findById(userId).populate('roleIds');
    if (!user || !user.active) return false;
    
    const normalizedTarget = normalizeRoleKey(roleKey);
    return user.roleIds.some(role => normalizeRoleKey(role.key) === normalizedTarget);
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
    
    const normalizedUserRoles = user.roleIds.map(role => normalizeRoleKey(role.key));
    const normalizedTargets = roleKeys.map(normalizeRoleKey);
    return normalizedTargets.some(roleKey => normalizedUserRoles.includes(roleKey));
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
    const isFounder = user.roleIds.some(role => role.key === ROLE_KEYS.FOUNDER);
    if (isFounder) {
      req.userRole = ROLE_KEYS.FOUNDER;
      return next();
    }

    // Project Manager has access to teams tied to their managed projects
    const isProjectManager = user.roleIds.some(role => isProjectManagerRole(role.key));
    if (isProjectManager) {
      const Project = require('../models/Project');
      const managedProjects = await Project.find({ ownerId: user._id }).select('_id teamId');

      const managedProjectIds = managedProjects.map(project => project._id.toString());
      const managedTeamIds = managedProjects
        .map(project => project.teamId && project.teamId.toString())
        .filter(Boolean);

      req.userRole = ROLE_KEYS.PROJECT_MANAGER;
      req.userManagedProjectIds = managedProjectIds;
      req.userManagedTeamIds = managedTeamIds;

      if (!managedProjects.length) {
        const memberTeamIds = (user.teamHistory || [])
          .map(entry => entry?.teamId && entry.teamId.toString())
          .filter(Boolean);

        if (!memberTeamIds.length) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. No managed projects or team memberships found.'
          });
        }

        req.userManagedTeamIds = memberTeamIds;
        req.userTeamId = memberTeamIds[memberTeamIds.length - 1];
      }

      return next();
    }

    // Team Member has limited access
    const isMember = user.roleIds.some(role => role.key === ROLE_KEYS.TEAM_MEMBER);
    if (isMember) {
      req.userRole = ROLE_KEYS.TEAM_MEMBER;
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
    const isFounder = user.roleIds.some(role => role.key === ROLE_KEYS.FOUNDER);
    if (isFounder) {
      req.userRole = ROLE_KEYS.FOUNDER;
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

      const isProjectMember = Array.isArray(project.projectMembers) &&
        project.projectMembers.some(memberId => memberId.toString() === user._id.toString());

      // Project Manager can access projects they own
    const isProjectManager = user.roleIds.some(role => isProjectManagerRole(role.key));
      if (isProjectManager) {
        if (project.ownerId && project.ownerId.toString() === user._id.toString()) {
          req.userRole = ROLE_KEYS.PROJECT_MANAGER;
          return next();
        }

        // Allow project managers who are active project members
        if (isProjectMember) {
          req.userRole = ROLE_KEYS.PROJECT_MANAGER;
          return next();
        }
      }

      // Team Member can access projects they're assigned to
      const isMember = user.roleIds.some(role => role.key === ROLE_KEYS.TEAM_MEMBER);
      if (isMember && isProjectMember) {
        req.userRole = ROLE_KEYS.TEAM_MEMBER;
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
    const normalizedRoles = roles.map(normalizeRoleKey);
    const isFounder = normalizedRoles.includes(ROLE_KEYS.FOUNDER);
    const isProjectManager = normalizedRoles.includes(ROLE_KEYS.PROJECT_MANAGER);
    const isMember = normalizedRoles.includes(ROLE_KEYS.TEAM_MEMBER);

    return {
      userId,
      name: user.name,
      email: user.email,
      roles,
      isFounder,
      isProjectManager,
      isMember,
      primaryRole: isFounder
        ? ROLE_KEYS.FOUNDER
        : isProjectManager
        ? ROLE_KEYS.PROJECT_MANAGER
        : isMember
        ? ROLE_KEYS.TEAM_MEMBER
        : 'UNKNOWN'
    };
  } catch (error) {
    console.error('Error getting user role info:', error);
    return null;
  }
};

module.exports = {
  ROLE_KEYS,
  PROJECT_MANAGER_KEYS,
  normalizeRoleKey,
  isProjectManagerRole,
  hasRole,
  hasAnyRole,
  restrictToRole,
  restrictToRoles,
  canAccessTeam,
  canAccessProject,
  getUserRoleInfo
};