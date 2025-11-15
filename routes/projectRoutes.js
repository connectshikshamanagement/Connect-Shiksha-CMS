const express = require('express');
const { createController } = require('../controllers/genericController');
const Project = require('../models/Project');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Team = require('../models/Team');
const Payroll = require('../models/Payroll');
const Task = require('../models/Task');
const { protect, authorize } = require('../middleware/auth');
const { computeProjectProfitSharing } = require('../utils/projectProfitSharing');
const { ROLE_KEYS, isProjectManagerRole } = require('../middleware/roleAccess');

const router = express.Router();
const projectController = createController(Project);

router.use(protect);

// Custom GET route to include budget utilization data
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('teamId', 'name')
      .populate('ownerId', 'name email')
      .populate('projectMembers', 'name email');

    // Calculate budget utilization for each project
    const projectsWithBudget = await Promise.all(
      projects.map(async (project) => {
        const expenses = await Expense.find({ projectId: project._id });
        const incomes = await Income.find({ 
          sourceRefId: project._id, 
          sourceRefModel: 'Project' 
        });

        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

        return {
          ...project.toObject(),
          totalExpense: totalExpenses,
          totalIncome: totalIncome,
          budgetUtilization: project.budget > 0 ? Math.round((totalExpenses / project.budget) * 100) : 0,
          dealCollection: project.totalDealAmount > 0 ? Math.round((totalIncome / project.totalDealAmount) * 100) : 0
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithBudget
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

const normalizeId = (value) => {
  if (!value) return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) {
    return value._id.toString();
  }
  if (typeof value.toString === 'function') {
    return value.toString();
  }
  return value;
};

const getRoleFlags = (req) => {
  const roleKeys = (req.user?.roleIds || []).map((role) => role.key);
  return {
    isFounder: roleKeys.includes(ROLE_KEYS.FOUNDER),
    isAdmin: roleKeys.includes('ADMIN'),
    isProjectManager: roleKeys.some(isProjectManagerRole)
  };
};

const ensureTeamMembership = async (teamId, userId) => {
  if (!teamId) {
    throw new Error('Team is required');
  }

  const team = await Team.findById(teamId).select('leadUserId members');
  if (!team) {
    const err = new Error('Team not found');
    err.statusCode = 404;
    throw err;
  }

  const stringUserId = userId.toString();
  const isLead =
    team.leadUserId && team.leadUserId.toString() === stringUserId;
  const isMember = (team.members || []).some(
    (memberId) => memberId.toString() === stringUserId
  );

  if (!isLead && !isMember) {
    const err = new Error('You can only manage projects for teams you belong to');
    err.statusCode = 403;
    throw err;
  }

  return team;
};

router.post('/', authorize('projects.create'), async (req, res) => {
  try {
    const { isFounder, isAdmin, isProjectManager } = getRoleFlags(req);

    if (!isFounder && !isAdmin) {
      if (!isProjectManager) {
        return res.status(403).json({
          success: false,
          message: 'Only founders or project managers can create projects'
        });
      }

      const normalizedTeamId = normalizeId(req.body.teamId);
      await ensureTeamMembership(normalizedTeamId, req.user._id);
      req.body.teamId = normalizedTeamId;
      req.body.ownerId = req.user._id;
    }

    const project = await Project.create(req.body);

    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create project'
    });
  }
});

// Get projects relevant to the current user (member or manager)
router.get('/my-team-projects', authorize('projects.read'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find teams where the user is a member OR the team lead
    const userTeams = await Team.find({ 
      active: true,
      $or: [
        { members: userId },
        { leadUserId: userId }
      ]
    }).select('_id name');
    
    if (userTeams.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No teams found for this user'
      });
    }
    
    const teamIds = userTeams.map(team => team._id);
    
    // Get projects related to these teams OR explicitly involving the user
    const projects = await Project.find({
      status: { $ne: 'cancelled' },
      $or: [
        { teamId: { $in: teamIds } },
        { ownerId: userId },
        { projectMembers: userId }
      ]
    })
    .populate('teamId', 'name category')
    .populate('ownerId', 'name email')
    .populate('projectMembers', 'name email')
    .sort('-createdAt');

    // Calculate financial data for each project
    const projectsWithFinancials = await Promise.all(
      projects.map(async (project) => {
        // Get expenses for this specific project (not just team)
        const expenses = await Expense.find({ 
          projectId: project._id 
        });
        
        // Get income for this specific project (not just team)
        const incomes = await Income.find({ 
          sourceRefId: project._id,
          sourceRefModel: 'Project'
        });

        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

        return {
          ...project.toObject(),
          totalExpense: totalExpenses,
          totalIncome: totalIncome,
          netProfit: totalIncome - totalExpenses,
          budgetUtilization: project.allocatedBudget > 0 ? Math.round((totalExpenses / project.allocatedBudget) * 100) : 0,
          teamName: project.teamId.name,
          teamCategory: project.teamId.category
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithFinancials,
      teamCount: userTeams.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/my-owned-projects', authorize('projects.read'), async (req, res) => {
  try {
    const projects = await Project.find({
      ownerId: req.user.id
    })
      .populate('teamId', 'name')
      .populate('projectMembers', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get detailed project financials for team members
router.get('/my-project-financials', authorize('projects.read'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find teams where the user is a member
    const userTeams = await Team.find({ 
      members: userId,
      active: true 
    }).select('_id name category');

    const teamIds = userTeams.map(team => team._id);

    const membershipFilters = [
      { ownerId: userId },
      { projectMembers: userId }
    ];

    if (teamIds.length > 0) {
      membershipFilters.push({ teamId: { $in: teamIds } });
    }

    // Get projects where the user is a team member, project member, or owner
    const projects = await Project.find({ 
      status: { $ne: 'cancelled' },
      $or: membershipFilters
    })
    .populate('teamId', 'name category')
    .populate('ownerId', 'name email')
    .populate('projectMembers', 'name email')
    .sort('-createdAt');

    // Calculate detailed financial data for each project
    const projectsWithDetailedFinancials = await Promise.all(
      projects.map(async (project) => {
        // Get detailed expenses for this specific project (not just team)
        const expenses = await Expense.find({ 
          projectId: project._id 
        }).populate('submittedBy', 'name email');
        
        // Get detailed income for this specific project (not just team)
        const incomes = await Income.find({ 
          sourceRefId: project._id,
          sourceRefModel: 'Project'
        }).populate('receivedByUserId', 'name email');

        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

        // Calculate expense breakdown by category
        const expenseBreakdown = {};
        expenses.forEach(expense => {
          const category = expense.category || 'Uncategorized';
          expenseBreakdown[category] = (expenseBreakdown[category] || 0) + expense.amount;
        });

        // Calculate income breakdown by source
        const incomeBreakdown = {};
        incomes.forEach(income => {
          const source = income.source || 'Direct Income';
          incomeBreakdown[source] = (incomeBreakdown[source] || 0) + income.amount;
        });

        // Calculate profit sharing
        const netProfit = totalIncome - totalExpenses;
        const connectShikshaShare = netProfit * 0.7; // 70% to Connect Shiksha
        const teamShare = netProfit * 0.3; // 30% to team
        
        // Count eligible team members (excluding founder)
        let eligibleMembers = 0;
        if (project.teamId?._id) {
          eligibleMembers = await Team.findById(project.teamId._id)
            .populate({
              path: 'members',
              populate: {
                path: 'roleIds',
                select: 'key'
              },
              select: 'roleIds'
            })
            .then(team => {
              if (!team) return 0;
              return team.members.filter(member =>
                !(member.roleIds || []).some(role => role?.key === 'FOUNDER')
              ).length;
            });
        }

        const myShare = eligibleMembers > 0 ? teamShare / eligibleMembers : 0;

        return {
          ...project.toObject(),
          totalExpense: totalExpenses,
          totalIncome: totalIncome,
          netProfit: netProfit,
          budgetUtilization: project.allocatedBudget > 0 ? Math.round((totalExpenses / project.allocatedBudget) * 100) : 0,
          teamName: project.teamId?.name || 'N/A',
          teamCategory: project.teamId?.category || 'N/A',
          expenseBreakdown,
          incomeBreakdown,
          profitSharing: {
            connectShikshaShare,
            teamShare,
            eligibleMembers,
            myShare: myShare
          },
          recentExpenses: expenses.slice(-5).map(exp => ({
            amount: exp.amount,
            category: exp.category,
            description: exp.description,
            submittedBy: exp.submittedBy?.name,
            date: exp.date
          })),
          recentIncomes: incomes.slice(-5).map(inc => ({
            amount: inc.amount,
            source: inc.source,
            description: inc.description,
            receivedBy: inc.receivedByUserId?.name,
            date: inc.date
          }))
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithDetailedFinancials,
      teamCount: userTeams.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Custom delete route with cascade deletion
router.delete('/:id', authorize('projects.delete'), async (req, res) => {
  try {
    const projectId = req.params.id;

    // Find the project first
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const hasAdminAccess = (req.user.roleIds || []).some(
      (role) => role.key === 'ADMIN' || role.key === 'FOUNDER'
    );
    const isProjectOwner = project.ownerId?.toString() === req.user._id?.toString();

    if (!hasAdminAccess && !isProjectOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the project manager or an admin can delete this project'
      });
    }

    // Delete all related data
    const [expensesDeleted, incomeDeleted, payrollDeleted, tasksDeleted] = await Promise.all([
      Expense.deleteMany({ projectId: projectId }),
      Income.deleteMany({ sourceRefId: projectId, sourceRefModel: 'Project' }),
      Payroll.deleteMany({ projectId: projectId }),
      Task.deleteMany({ projectId: projectId })
    ]);

    // Delete the project
    await Project.findByIdAndDelete(projectId);

    res.status(200).json({
      success: true,
      message: 'Project and all related data deleted successfully',
      deletedCounts: {
        expenses: expensesDeleted.deletedCount || 0,
        income: incomeDeleted.deletedCount || 0,
        payroll: payrollDeleted.deletedCount || 0,
        tasks: tasksDeleted.deletedCount || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Generic routes for individual project operations (must be last)
// Override update to also recompute profit sharing for current month
router
  .route('/:id')
  .get(projectController.getOne)
  .put(authorize('projects.update'), async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      const { isFounder, isAdmin } = getRoleFlags(req);
      const hasAdminAccess = isFounder || isAdmin;
      const isProjectOwner = project.ownerId?.toString() === req.user._id?.toString();

      if (!hasAdminAccess && !isProjectOwner) {
        return res.status(403).json({
          success: false,
          message: 'Only the project manager or an admin can update this project'
        });
      }

      if (!hasAdminAccess) {
        if (req.body.ownerId && req.body.ownerId.toString() !== project.ownerId.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Project managers cannot reassign project ownership'
          });
        }

        const incomingTeamId = normalizeId(req.body.teamId);
        if (incomingTeamId && incomingTeamId !== project.teamId.toString()) {
          try {
            await ensureTeamMembership(incomingTeamId, req.user._id);
            req.body.teamId = incomingTeamId;
          } catch (err) {
            return res.status(err.statusCode || 500).json({
              success: false,
              message: err.message
            });
          }
        }
      }

      // Apply updates (mirror generic controller behavior)
      project.set(req.body);
      if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach((key) => {
          const path = project.schema?.path?.(key);
          if (path && path.instance === 'Mixed') {
            project.markModified(key);
          }
        });
      }

      await project.save();

      // Recompute profit sharing for this project for the current period
      try {
        await computeProjectProfitSharing(project._id);
      } catch (err) {
        console.error('Error recomputing profit sharing after project update:', err?.message || err);
        // Do not fail the update due to compute errors; return project update result
      }

      res.status(200).json({ success: true, data: project });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

module.exports = router;

