const express = require('express');
const Income = require('../models/Income');
const { protect, authorize } = require('../middleware/auth');
const { computeProfitSharing } = require('../utils/profitSharing');

const router = express.Router();

router.use(protect);

// Get all income
router.get('/', authorize('finance.read'), async (req, res) => {
  try {
    const income = await Income.find()
      .populate('receivedByUserId')
      .populate('clientId')
      .sort('-date');

    res.status(200).json({
      success: true,
      count: income.length,
      data: income
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create income and trigger profit sharing
router.post('/', authorize('finance.create'), async (req, res) => {
  try {
    // Clean the request body to handle empty strings
    const cleanedBody = {
      ...req.body,
      receivedByUserId: req.user.id
    };

    // Handle empty clientId - set to undefined if empty string
    if (cleanedBody.clientId === '' || cleanedBody.clientId === null) {
      cleanedBody.clientId = undefined;
    }

    const income = await Income.create(cleanedBody);

    // Automatically compute profit sharing
    if (!income.profitShared) {
      await computeProfitSharing(income);
    }

    res.status(201).json({
      success: true,
      data: income
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
      const income = await Income.findById(req.params.id)
        .populate('receivedByUserId')
        .populate('clientId');

      if (!income) {
        return res.status(404).json({
          success: false,
          message: 'Income record not found'
        });
      }

      res.status(200).json({
        success: true,
        data: income
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  })
  .put(authorize('finance.update'), async (req, res) => {
    try {
      const income = await Income.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });

      if (!income) {
        return res.status(404).json({
          success: false,
          message: 'Income record not found'
        });
      }

      res.status(200).json({
        success: true,
        data: income
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
      const income = await Income.findByIdAndDelete(req.params.id);

      if (!income) {
        return res.status(404).json({
          success: false,
          message: 'Income record not found'
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

