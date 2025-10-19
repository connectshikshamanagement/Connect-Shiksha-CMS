const express = require('express');
const Expense = require('../models/Expense');
const Team = require('../models/Team');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { isFounder } = require('../utils/roleAccess');

const router = express.Router();

router.use(protect);

// Get expenses by team
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status, category, month, year } = req.query;

    // Check if user can access team expenses
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const founder = isFounder(req.user);
    const isTeamLead = String(team.leadUserId) === String(req.user.id);
    const isTeamMember = team.members.includes(req.user.id);

    if (!founder && !isTeamLead && !isTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }

    let query = { teamId };
    if (status) query.status = status;
    if (category) query.category = category;

    // Add date filter if specified
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const expenses = await Expense.find(query)
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('teamId', 'name category')
      .populate('projectId', 'title')
      .sort('-date');

    // Calculate team budget summary
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const monthlyExpenses = await Expense.aggregate([
      {
        $match: {
          teamId: team._id,
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalExpense: { $sum: '$amount' }
        }
      }
    ]);

    const totalMonthlyExpense = monthlyExpenses.length > 0 ? monthlyExpenses[0].totalExpense : 0;
    const remainingBudget = team.monthlyBudget - totalMonthlyExpense;
    const creditUsed = Math.max(0, totalMonthlyExpense - team.monthlyBudget);

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
      budgetSummary: {
        monthlyBudget: team.monthlyBudget,
        creditLimit: team.creditLimit,
        totalExpense: totalMonthlyExpense,
        remainingBudget,
        creditUsed,
        budgetUsage: team.monthlyBudget > 0 ? (totalMonthlyExpense / team.monthlyBudget) * 100 : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get expenses by user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, category, month, year } = req.query;

    // Check if user can access these expenses
    const founder = isFounder(req.user);
    const isOwnExpenses = String(req.user.id) === String(userId);
    
    // Check if user is a team lead for this user
    const userTeams = await Team.find({ members: userId });
    const isTeamLeadForUser = userTeams.some(team => 
      String(team.leadUserId) === String(req.user.id)
    );

    if (!founder && !isOwnExpenses && !isTeamLeadForUser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    let query = { submittedBy: userId };
    if (status) query.status = status;
    if (category) query.category = category;

    // Add date filter if specified
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const expenses = await Expense.find(query)
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('teamId', 'name category')
      .populate('projectId', 'title')
      .sort('-date');

    // Calculate user's monthly expense summary
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const monthlyExpenses = await Expense.aggregate([
      {
        $match: {
          submittedBy: userId,
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

    const totalMonthlyExpense = monthlyExpenses.length > 0 ? monthlyExpenses[0].totalExpense : 0;
    const expenseCount = monthlyExpenses.length > 0 ? monthlyExpenses[0].count : 0;

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
      monthlySummary: {
        totalExpense: totalMonthlyExpense,
        expenseCount,
        avgExpense: expenseCount > 0 ? totalMonthlyExpense / expenseCount : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create expense with budget validation
router.post('/', async (req, res) => {
  try {
    const { teamId, category, amount, description, date, paymentMethod, vendorName, billNumber, projectId } = req.body;

    // Check if user can create expenses for this team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const founder = isFounder(req.user);
    const isTeamLead = String(team.leadUserId) === String(req.user.id);
    const isTeamMember = team.members.includes(req.user.id);

    if (!founder && !isTeamLead && !isTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }

    // Budget validation for member-specific expenses
    if (!founder && !isTeamLead) {
      // Check member budget
      const memberBudget = team.memberBudgets.find(
        budget => String(budget.memberId) === String(req.user.id)
      );

      if (memberBudget) {
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const memberExpenses = await Expense.aggregate([
          {
            $match: {
              teamId: team._id,
              submittedBy: req.user.id,
              date: { $gte: startOfMonth, $lte: endOfMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalExpense: { $sum: '$amount' }
            }
          }
        ]);

        const currentExpense = memberExpenses.length > 0 ? memberExpenses[0].totalExpense : 0;
        const totalAfterExpense = currentExpense + amount;
        const maxAllowed = memberBudget.monthlyLimit + memberBudget.creditLimit;

        if (totalAfterExpense > maxAllowed) {
          return res.status(400).json({
            success: false,
            message: `Budget limit exceeded for this member. Current expenses: ₹${currentExpense}, Monthly limit: ₹${memberBudget.monthlyLimit}, Credit limit: ₹${memberBudget.creditLimit}, Max allowed: ₹${maxAllowed}`
          });
        }
      }
    }

    // Create expense
    const expense = await Expense.create({
      teamId,
      category,
      amount,
      description,
      date: date || new Date(),
      paymentMethod: paymentMethod || 'bank_transfer',
      vendorName,
      billNumber,
      projectId,
      submittedBy: req.user.id
    });

    // Update user's expense history
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        expenseHistory: {
          expenseId: expense._id,
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          teamId: expense.teamId,
          status: expense.status
        }
      }
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('submittedBy', 'name email')
      .populate('teamId', 'name category')
      .populate('projectId', 'title');

    res.status(201).json({
      success: true,
      data: populatedExpense
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Approve/Reject expense
router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Check permissions for approval
    const founder = isFounder(req.user);
    const team = await Team.findById(expense.teamId);
    const isTeamLead = String(team.leadUserId) === String(req.user.id);

    if (!founder && !isTeamLead) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only team leads and founders can approve expenses.'
      });
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      {
        status,
        approvedBy: req.user.id
      },
      { new: true, runValidators: true }
    ).populate('submittedBy', 'name email')
     .populate('approvedBy', 'name email')
     .populate('teamId', 'name category')
     .populate('projectId', 'title');

    // Update user's expense history
    await User.findByIdAndUpdate(expense.submittedBy, {
      $set: {
        'expenseHistory.$[elem].status': status
      }
    }, {
      arrayFilters: [{ 'elem.expenseId': expense._id }]
    });

    res.status(200).json({
      success: true,
      data: updatedExpense
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get expense analytics
router.get('/analytics/:teamId', authorize('finance.read'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { month, year } = req.query;

    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1);
    const targetYear = year || currentDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Team expense analytics
    const teamAnalytics = await Expense.aggregate([
      {
        $match: {
          teamId: team._id,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          expenseCount: { $sum: 1 }
        }
      }
    ]);

    // Member-wise analytics
    const memberAnalytics = await Expense.aggregate([
      {
        $match: {
          teamId: team._id,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$submittedBy',
          totalExpenses: { $sum: '$amount' },
          expenseCount: { $sum: 1 }
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
          totalExpenses: 1,
          approvedExpenses: 1,
          expenseCount: 1,
          approvedCount: 1,
          approvalRate: {
            $multiply: [
              { $divide: ['$approvedCount', '$expenseCount'] },
              100
            ]
          },
          avgExpense: { $divide: ['$totalExpenses', '$expenseCount'] }
        }
      }
    ]);

    // Category-wise analytics
    const categoryAnalytics = await Expense.aggregate([
      {
        $match: {
          teamId: team._id,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: `${targetMonth}/${targetYear}`,
        teamAnalytics: teamAnalytics[0] || {
          totalExpenses: 0,
          approvedExpenses: 0,
          pendingExpenses: 0,
          rejectedExpenses: 0,
          expenseCount: 0,
          approvedCount: 0,
          pendingCount: 0
        },
        memberAnalytics,
        categoryAnalytics
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
