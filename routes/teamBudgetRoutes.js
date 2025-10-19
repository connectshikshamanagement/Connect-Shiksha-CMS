const express = require('express');
const Team = require('../models/Team');
const User = require('../models/User');
const Expense = require('../models/Expense');
const { protect, authorize } = require('../middleware/auth');
const { isFounder } = require('../utils/roleAccess');

const router = express.Router();

router.use(protect);

// Get team budget summary
router.get('/:teamId/budget', authorize('finance.read'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate('memberBudgets.memberId', 'name email')
      .populate('leadUserId', 'name email');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Calculate current month expenses for each member
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const memberBudgets = await Promise.all(
      team.memberBudgets.map(async (memberBudget) => {
        const memberExpenses = await Expense.aggregate([
          {
            $match: {
              teamId: team._id,
              submittedBy: memberBudget.memberId,
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
        const remainingBudget = memberBudget.monthlyLimit - currentExpense;
        const creditUsed = Math.max(0, currentExpense - memberBudget.monthlyLimit);

        return {
          memberId: memberBudget.memberId,
          monthlyLimit: memberBudget.monthlyLimit,
          creditLimit: memberBudget.creditLimit,
          currentExpense,
          remainingBudget,
          creditUsed,
          budgetUsage: memberBudget.monthlyLimit > 0 ? (currentExpense / memberBudget.monthlyLimit) * 100 : 0,
          isOverBudget: currentExpense > (memberBudget.monthlyLimit + memberBudget.creditLimit)
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        team: {
          _id: team._id,
          name: team.name,
          category: team.category,
          monthlyBudget: team.monthlyBudget,
          creditLimit: team.creditLimit,
          leadUserId: team.leadUserId
        },
        memberBudgets
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update member budget
router.put('/:teamId/member-budget/:memberId', authorize('finance.update'), async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const { monthlyLimit, creditLimit } = req.body;

    // Check if user can update budgets
    const founder = isFounder(req.user);
    const team = await Team.findById(teamId);
    
    if (!founder && String(team.leadUserId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only team leads and founders can update member budgets.'
      });
    }

    // Check if member is in the team
    if (!team.members.includes(memberId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of this team'
      });
    }

    // Update or create member budget
    const existingBudgetIndex = team.memberBudgets.findIndex(
      budget => String(budget.memberId) === String(memberId)
    );

    if (existingBudgetIndex >= 0) {
      team.memberBudgets[existingBudgetIndex].monthlyLimit = monthlyLimit;
      team.memberBudgets[existingBudgetIndex].creditLimit = creditLimit;
      team.memberBudgets[existingBudgetIndex].lastResetDate = new Date();
    } else {
      team.memberBudgets.push({
        memberId,
        monthlyLimit,
        creditLimit,
        currentExpense: 0,
        remainingBudget: monthlyLimit,
        lastResetDate: new Date()
      });
    }

    await team.save();

    const updatedTeam = await Team.findById(teamId)
      .populate('memberBudgets.memberId', 'name email');

    res.status(200).json({
      success: true,
      data: updatedTeam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reset member budgets for new month
router.post('/:teamId/reset-budgets', authorize('finance.update'), async (req, res) => {
  try {
    const { teamId } = req.params;

    // Check permissions
    const founder = isFounder(req.user);
    const team = await Team.findById(teamId);
    
    if (!founder && String(team.leadUserId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Reset all member budgets
    team.memberBudgets.forEach(budget => {
      budget.currentExpense = 0;
      budget.remainingBudget = budget.monthlyLimit;
      budget.lastResetDate = new Date();
    });

    await team.save();

    res.status(200).json({
      success: true,
      message: 'Member budgets reset successfully',
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get member budget validation
router.get('/:teamId/member/:memberId/budget-status', async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const { amount } = req.query;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const memberBudget = team.memberBudgets.find(
      budget => String(budget.memberId) === String(memberId)
    );

    if (!memberBudget) {
      return res.status(404).json({
        success: false,
        message: 'Member budget not found'
      });
    }

    // Calculate current month expenses
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const memberExpenses = await Expense.aggregate([
      {
        $match: {
          teamId: team._id,
          submittedBy: memberId,
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
    const newExpenseAmount = parseFloat(amount) || 0;
    const totalAfterExpense = currentExpense + newExpenseAmount;
    const maxAllowed = memberBudget.monthlyLimit + memberBudget.creditLimit;

    const canProceed = totalAfterExpense <= maxAllowed;
    const remainingBudget = memberBudget.monthlyLimit - currentExpense;
    const creditUsed = Math.max(0, currentExpense - memberBudget.monthlyLimit);

    res.status(200).json({
      success: true,
      data: {
        canProceed,
        currentExpense,
        newExpenseAmount,
        totalAfterExpense,
        monthlyLimit: memberBudget.monthlyLimit,
        creditLimit: memberBudget.creditLimit,
        maxAllowed,
        remainingBudget,
        creditUsed,
        budgetUsage: memberBudget.monthlyLimit > 0 ? (currentExpense / memberBudget.monthlyLimit) * 100 : 0
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
