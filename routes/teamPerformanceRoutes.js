const express = require('express');
const Team = require('../models/Team');
const Task = require('../models/Task');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { isFounder } = require('../utils/roleAccess');

const router = express.Router();

router.use(protect);

// Get team performance summary
router.get('/:teamId/summary', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { month, year } = req.query;

    const team = await Team.findById(teamId)
      .populate('leadUserId', 'name email')
      .populate('members', 'name email');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check access permissions
    // Populate user roles if not already populated
    let userWithRoles = req.user;
    if (req.user.roleIds && req.user.roleIds.length > 0 && typeof req.user.roleIds[0] === 'object' && req.user.roleIds[0]._id) {
      // Already populated
      userWithRoles = req.user;
    } else {
      // Need to populate roles
      userWithRoles = await User.findById(req.user.id).populate('roleIds', 'key name');
    }
    
    const founder = isFounder(userWithRoles);
    const isTeamLead = team.leadUserId && String(team.leadUserId._id) === String(req.user.id);
    const isTeamMember = team.members.some(member => String(member._id) === String(req.user.id));

    if (!founder && !isTeamLead && !isTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }

    // Get current month if not specified
    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1);
    const targetYear = year || currentDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    // Calculate financial metrics
    const financialMetrics = await calculateFinancialMetrics(teamId, startDate, endDate);
    
    // Calculate task metrics
    const taskMetrics = await calculateTaskMetrics(teamId, startDate, endDate);
    
    // Calculate member performance
    const memberPerformance = await calculateMemberPerformance(teamId, startDate, endDate);

    // Calculate overall performance rating
    const performanceRating = calculatePerformanceRating(taskMetrics, financialMetrics);

    const summary = {
      team: {
        _id: team._id,
        name: team.name,
        category: team.category,
        leadUserId: team.leadUserId,
        memberCount: team.members.length
      },
      period: `${targetMonth}/${targetYear}`,
      financial: financialMetrics,
      tasks: taskMetrics,
      memberPerformance,
      performanceRating,
      budgetSummary: {
        monthlyBudget: team.monthlyBudget,
        creditLimit: team.creditLimit,
        totalUsed: financialMetrics.expenses.totalAmount,
        remaining: Math.max(0, team.monthlyBudget - financialMetrics.expenses.totalAmount),
        creditUsed: Math.max(0, financialMetrics.expenses.totalAmount - team.monthlyBudget),
        budgetUsage: team.monthlyBudget > 0 ? (financialMetrics.expenses.totalAmount / team.monthlyBudget) * 100 : 0
      }
    };

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get team performance analytics
router.get('/:teamId/analytics', authorize('finance.read'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { period = 'month' } = req.query;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    let dateRange;
    if (period === 'month') {
      const currentDate = new Date();
      dateRange = {
        start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      };
    } else if (period === 'quarter') {
      const currentDate = new Date();
      const quarter = Math.floor(currentDate.getMonth() / 3);
      dateRange = {
        start: new Date(currentDate.getFullYear(), quarter * 3, 1),
        end: new Date(currentDate.getFullYear(), quarter * 3 + 3, 0)
      };
    } else if (period === 'year') {
      const currentDate = new Date();
      dateRange = {
        start: new Date(currentDate.getFullYear(), 0, 1),
        end: new Date(currentDate.getFullYear(), 11, 31)
      };
    }

    // Get detailed analytics
    const analytics = {
      financial: await getDetailedFinancialAnalytics(teamId, dateRange),
      tasks: await getDetailedTaskAnalytics(teamId, dateRange),
      members: await getDetailedMemberAnalytics(teamId, dateRange),
      trends: await getPerformanceTrends(teamId, period)
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper functions
async function calculateFinancialMetrics(teamId, startDate, endDate) {
  // Income metrics
  const incomeMetrics = await Income.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate }
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
        'team._id': mongoose.Types.ObjectId(teamId)
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);

  // Expense metrics
  const expenseMetrics = await Expense.aggregate([
    {
      $match: {
        teamId: mongoose.Types.ObjectId(teamId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);

  // Payroll metrics
  const payrollMetrics = await Payroll.aggregate([
    {
      $match: {
        teamId: mongoose.Types.ObjectId(teamId),
        month: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$salaryAmount' },
        count: { $sum: 1 },
        paidAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$salaryAmount', 0] }
        }
      }
    }
  ]);

  return {
    income: incomeMetrics[0] || { totalAmount: 0, count: 0, avgAmount: 0 },
    expenses: expenseMetrics[0] || { totalAmount: 0, count: 0, avgAmount: 0, approvedAmount: 0, pendingAmount: 0 },
    payroll: payrollMetrics[0] || { totalAmount: 0, count: 0, paidAmount: 0 }
  };
}

async function calculateTaskMetrics(teamId, startDate, endDate) {
  const taskMetrics = await Task.aggregate([
    {
      $match: {
        teamId: mongoose.Types.ObjectId(teamId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
        },
        inProgressTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ['$deadline', new Date()] },
                  { $ne: ['$status', 'done'] }
                ]
              },
              1,
              0
            ]
          }
        },
        avgProgress: { $avg: '$progress' },
        avgCompletionTime: {
          $avg: {
            $cond: [
              { $eq: ['$status', 'done'] },
              { $subtract: ['$updatedAt', '$createdAt'] },
              null
            ]
          }
        }
      }
    }
  ]);

  const metrics = taskMetrics[0] || {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    avgProgress: 0,
    avgCompletionTime: 0
  };

  return {
    ...metrics,
    completionRate: metrics.totalTasks > 0 ? (metrics.completedTasks / metrics.totalTasks) * 100 : 0,
    avgCompletionTimeDays: metrics.avgCompletionTime ? Math.round(metrics.avgCompletionTime / (1000 * 60 * 60 * 24)) : 0
  };
}

async function calculateMemberPerformance(teamId, startDate, endDate) {
  const memberPerformance = await Task.aggregate([
    {
      $match: {
        teamId: mongoose.Types.ObjectId(teamId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$assignedTo',
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
        },
        avgProgress: { $avg: '$progress' },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ['$deadline', new Date()] },
                  { $ne: ['$status', 'done'] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        memberName: '$user.name',
        memberEmail: '$user.email',
        totalTasks: 1,
        completedTasks: 1,
        completionRate: {
          $multiply: [
            { $divide: ['$completedTasks', '$totalTasks'] },
            100
          ]
        },
        avgProgress: 1,
        overdueTasks: 1
      }
    }
  ]);

  return memberPerformance;
}

function calculatePerformanceRating(taskMetrics, financialMetrics) {
  let score = 0;
  
  // Task completion rate (40% weight)
  score += (taskMetrics.completionRate || 0) * 0.4;
  
  // On-time delivery (30% weight)
  const onTimeRate = taskMetrics.totalTasks > 0 ? 
    ((taskMetrics.totalTasks - taskMetrics.overdueTasks) / taskMetrics.totalTasks) * 100 : 0;
  score += onTimeRate * 0.3;
  
  // Budget utilization (30% weight)
  const budgetUtilization = financialMetrics.expenses.totalAmount > 0 && financialMetrics.income.totalAmount > 0 ?
    (financialMetrics.income.totalAmount / (financialMetrics.expenses.totalAmount + financialMetrics.payroll.totalAmount)) * 100 : 0;
  score += Math.min(budgetUtilization * 0.3, 30); // Cap at 30 points

  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Average';
  if (score >= 60) return 'Below Average';
  return 'Poor';
}

async function getDetailedFinancialAnalytics(teamId, dateRange) {
  // Implementation for detailed financial analytics
  return {
    income: { total: 0, trends: [] },
    expenses: { total: 0, trends: [] },
    payroll: { total: 0, trends: [] }
  };
}

async function getDetailedTaskAnalytics(teamId, dateRange) {
  // Implementation for detailed task analytics
  return {
    completion: { rate: 0, trends: [] },
    productivity: { score: 0, trends: [] }
  };
}

async function getDetailedMemberAnalytics(teamId, dateRange) {
  // Implementation for detailed member analytics
  return {
    performance: [],
    productivity: []
  };
}

async function getPerformanceTrends(teamId, period) {
  // Implementation for performance trends
  return {
    tasks: [],
    financial: [],
    overall: []
  };
}

module.exports = router;
