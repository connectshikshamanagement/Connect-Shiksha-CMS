const express = require('express');
const Expense = require('../models/Expense');
const Team = require('../models/Team');
const { protect, authorize } = require('../middleware/auth');
const { isFounder, getAllowedExpenseUnits, isAllowedValue } = require('../utils/roleAccess');

const router = express.Router();

router.use(protect);

// Get all expenses
router.get('/', authorize('finance.read'), async (req, res) => {
  try {
    const isFounder = (req.user.roleIds || []).some((r) => r.key === 'FOUNDER');
    const query = isFounder ? {} : { submittedBy: req.user.id };

    const expenses = await Expense.find(query)
      .populate('submittedBy')
      .populate('projectId')
      .sort('-date');

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create expense
router.post('/', async (req, res) => {
  try {
    const founder = isFounder(req.user);
    if (!founder && typeof req.body.businessUnit === 'string') {
      const allowed = getAllowedExpenseUnits(req.user);
      if (!isAllowedValue(allowed, req.body.businessUnit)) {
        return res.status(403).json({ success: false, message: 'You are not allowed to create expense for this unit' });
      }
    }

    // Budget validation for team-based expenses
    if (req.body.teamId) {
      const team = await Team.findById(req.body.teamId);
      if (!team) {
        return res.status(404).json({ success: false, message: 'Team not found' });
      }

      // Calculate current month expenses for the team
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const currentMonthExpenses = await Expense.aggregate([
        {
          $match: {
            teamId: team._id,
            date: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const totalCurrentExpenses = currentMonthExpenses.length > 0 ? currentMonthExpenses[0].total : 0;
      const newExpenseAmount = req.body.amount || 0;
      const totalAfterExpense = totalCurrentExpenses + newExpenseAmount;
      const maxAllowed = (team.monthlyBudget || 0) + (team.creditLimit || 0);

      // Only check budget limit if team has a budget set
      if (maxAllowed > 0 && totalAfterExpense > maxAllowed) {
        return res.status(400).json({
          success: false,
          message: `Budget limit exceeded for this team. Current expenses: ₹${totalCurrentExpenses}, Monthly budget: ₹${team.monthlyBudget || 0}, Credit limit: ₹${team.creditLimit || 0}, Max allowed: ₹${maxAllowed}`
        });
      }
    }

    const expense = await Expense.create({
      ...req.body,
      submittedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: expense
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


router
  .route('/:id')
  .get(authorize('finance.read'), async (req, res) => {
    try {
      const expense = await Expense.findById(req.params.id)
        .populate('submittedBy')
        .populate('projectId');

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      const isFounder = (req.user.roleIds || []).some((r) => r.key === 'FOUNDER');
      if (!isFounder && String(expense.submittedBy?._id || expense.submittedBy) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      res.status(200).json({
        success: true,
        data: expense
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  })
  .put(async (req, res) => {
    try {
      const existing = await Expense.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Expense not found' });
      }

      const founder = isFounder(req.user);
      if (!founder && String(existing.submittedBy) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      // Enforce allowed businessUnit on update when provided
      if (!founder && typeof req.body.businessUnit === 'string') {
        const allowed = getAllowedExpenseUnits(req.user);
        if (!isAllowedValue(allowed, req.body.businessUnit)) {
          return res.status(403).json({ success: false, message: 'You are not allowed to use this business unit' });
        }
      }

      const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });

      res.status(200).json({
        success: true,
        data: expense
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  })
  .delete(authorize('finance.delete'), async (req, res) => {
    try {
      const existing = await Expense.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Expense not found' });
      }
      const isFounder = (req.user.roleIds || []).some((r) => r.key === 'FOUNDER');
      if (!isFounder && String(existing.submittedBy) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      await Expense.findByIdAndDelete(req.params.id);

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
  });

module.exports = router;

