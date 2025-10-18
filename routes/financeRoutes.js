const express = require('express');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Team = require('../models/Team');
const Project = require('../models/Project');
const Payroll = require('../models/Payroll');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Get team-wise financial summary
router.get('/team-summary', authorize('finance.read'), async (req, res) => {
  try {
    const { month } = req.query;
    
    // Get current month if not specified
    const currentDate = new Date();
    const targetMonth = month || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const [year, monthNum] = targetMonth.split('-');
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0);

    // Get all teams
    const teams = await Team.find({ active: true }).populate('leadUserId', 'name email');

    // Get team-wise financial data
    const teamFinancials = await Promise.all(
      teams.map(async (team) => {
        // Calculate team expenses for the month
        const teamExpenses = await Expense.aggregate([
          {
            $match: {
              teamId: team._id,
              status: 'approved',
              date: { $gte: startOfMonth, $lte: endOfMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalExpense: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]);

        // Calculate team income for the month
        const teamIncome = await Income.aggregate([
          {
            $match: {
              date: { $gte: startOfMonth, $lte: endOfMonth }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'receivedByUserId',
              foreignField: '_id',
              as: 'user'
            }
          },
          {
            $unwind: '$user'
          },
          {
            $lookup: {
              from: 'teams',
              localField: 'user._id',
              foreignField: 'members',
              as: 'team'
            }
          },
          {
            $match: {
              'team._id': team._id
            }
          },
          {
            $group: {
              _id: null,
              totalIncome: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]);

        // Calculate team payroll for the month
        const teamPayroll = await Payroll.aggregate([
          {
            $match: {
              teamId: team._id,
              month: targetMonth
            }
          },
          {
            $group: {
              _id: null,
              totalPayroll: { $sum: '$salaryAmount' },
              pendingPayroll: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'pending'] }, '$salaryAmount', 0]
                }
              },
              paidPayroll: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'paid'] }, '$salaryAmount', 0]
                }
              },
              count: { $sum: 1 }
            }
          }
        ]);

        const totalExpense = teamExpenses.length > 0 ? teamExpenses[0].totalExpense : 0;
        const totalIncome = teamIncome.length > 0 ? teamIncome[0].totalIncome : 0;
        const totalPayroll = teamPayroll.length > 0 ? teamPayroll[0].totalPayroll : 0;
        const pendingPayroll = teamPayroll.length > 0 ? teamPayroll[0].pendingPayroll : 0;
        const paidPayroll = teamPayroll.length > 0 ? teamPayroll[0].paidPayroll : 0;

        const remainingBudget = team.monthlyBudget - totalExpense;
        const creditUsed = Math.max(0, totalExpense - team.monthlyBudget);
        const netProfit = totalIncome - totalExpense - totalPayroll;

        return {
          teamId: team._id,
          teamName: team.name,
          category: team.category,
          leadUserId: team.leadUserId,
          monthlyBudget: team.monthlyBudget,
          creditLimit: team.creditLimit,
          totalIncome,
          totalExpense,
          totalPayroll,
          pendingPayroll,
          paidPayroll,
          remainingBudget,
          creditUsed,
          netProfit,
          memberCount: team.members?.length || 0
        };
      })
    );

    res.status(200).json({
      success: true,
      data: teamFinancials,
      month: targetMonth
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get project-wise financial summary
router.get('/project-summary', authorize('finance.read'), async (req, res) => {
  try {
    const { month } = req.query;
    
    // Get current month if not specified
    const currentDate = new Date();
    const targetMonth = month || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const [year, monthNum] = targetMonth.split('-');
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0);

    // Get all projects
    const projects = await Project.find()
      .populate('teamId', 'name category')
      .populate('ownerId', 'name email');

    // Get project-wise financial data
    const projectFinancials = await Promise.all(
      projects.map(async (project) => {
        // Calculate project expenses for the month
        const projectExpenses = await Expense.aggregate([
          {
            $match: {
              projectId: project._id,
              status: 'approved',
              date: { $gte: startOfMonth, $lte: endOfMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalExpense: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]);

        // Calculate project income for the month
        const projectIncome = await Income.aggregate([
          {
            $match: {
              sourceRefId: project._id,
              sourceRefModel: 'Project',
              date: { $gte: startOfMonth, $lte: endOfMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalIncome: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]);

        const totalExpense = projectExpenses.length > 0 ? projectExpenses[0].totalExpense : 0;
        const totalIncome = projectIncome.length > 0 ? projectIncome[0].totalIncome : 0;
        const allocatedBudget = project.allocatedBudget || 0;
        const budgetExceeded = totalExpense > allocatedBudget;

        return {
          projectId: project._id,
          projectName: project.title,
          category: project.category,
          status: project.status,
          teamId: project.teamId,
          ownerId: project.ownerId,
          allocatedBudget,
          totalIncome,
          totalExpense,
          investmentAmount: project.investmentAmount || 0,
          netProfit: totalIncome - totalExpense,
          budgetExceeded,
          progress: project.progress || 0,
          startDate: project.startDate,
          endDate: project.endDate
        };
      })
    );

    res.status(200).json({
      success: true,
      data: projectFinancials,
      month: targetMonth
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update team budget
router.put('/team/:teamId/budget', authorize('finance.update'), async (req, res) => {
  try {
    const { monthlyBudget, creditLimit } = req.body;

    const team = await Team.findByIdAndUpdate(
      req.params.teamId,
      { monthlyBudget, creditLimit },
      { new: true, runValidators: true }
    ).populate('leadUserId', 'name email');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reset team budgets for new month
router.post('/reset-budgets', authorize('finance.update'), async (req, res) => {
  try {
    const { month } = req.body;
    
    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month is required (YYYY-MM format)'
      });
    }

    // This would typically reset monthly budget tracking
    // For now, we'll just return success as the budget validation happens dynamically
    res.status(200).json({
      success: true,
      message: `Budget tracking reset for ${month}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
