const express = require('express');
const Expense = require('../models/Expense');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Get all expenses
router.get('/', authorize('finance.read'), async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate('submittedBy')
      .populate('approvedBy')
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

// Approve/Reject expense
router.patch('/:id/approve', authorize('finance.update'), async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        status,
        approvedBy: req.user.id
      },
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
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
});

router
  .route('/:id')
  .get(authorize('finance.read'), async (req, res) => {
    try {
      const expense = await Expense.findById(req.params.id)
        .populate('submittedBy')
        .populate('approvedBy')
        .populate('projectId');

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
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
      const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
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
  .delete(authorize('finance.delete'), async (req, res) => {
    try {
      const expense = await Expense.findByIdAndDelete(req.params.id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

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

