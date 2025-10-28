const express = require('express');
const { createController } = require('../controllers/genericController');
const Project = require('../models/Project');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Team = require('../models/Team');
const Payroll = require('../models/Payroll');
const Task = require('../models/Task');
const { protect, authorize } = require('../middleware/auth');

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

router
  .route('/')
  .post(authorize('projects.create'), projectController.create);

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

// Get detailed project financials for team members
router.get('/my-project-financials', authorize('projects.read'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find teams where the user is a member
    const userTeams = await Team.find({ 
      members: userId,
      active: true 
    }).select('_id name');
    
    if (userTeams.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No teams found for this user'
      });
    }
    
    const teamIds = userTeams.map(team => team._id);
    
    // Get projects for these teams
    const projects = await Project.find({ 
      teamId: { $in: teamIds },
      status: { $ne: 'cancelled' }
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
        const eligibleMembers = await Team.findById(project.teamId._id)
          .populate('members', 'roleIds')
          .then(team => {
            return team.members.filter(member => 
              !member.roleIds.some(role => role.key === 'FOUNDER')
            ).length;
          });

        const myShare = eligibleMembers > 0 ? teamShare / eligibleMembers : 0;

        return {
          ...project.toObject(),
          totalExpense: totalExpenses,
          totalIncome: totalIncome,
          netProfit: netProfit,
          budgetUtilization: project.allocatedBudget > 0 ? Math.round((totalExpenses / project.allocatedBudget) * 100) : 0,
          teamName: project.teamId.name,
          teamCategory: project.teamId.category,
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
router
  .route('/:id')
  .get(projectController.getOne)
  .put(authorize('projects.update'), projectController.update);

module.exports = router;

