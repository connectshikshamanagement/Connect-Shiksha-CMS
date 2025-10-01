const express = require('express');
const Payout = require('../models/Payout');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Get all payouts
router.get('/', authorize('payroll.read'), async (req, res) => {
  try {
    const { month, year, userId, status } = req.query;
    const filter = {};

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const payouts = await Payout.find(filter)
      .populate('userId')
      .populate('processedBy')
      .sort('-year -month');

    res.status(200).json({
      success: true,
      count: payouts.length,
      data: payouts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get my payouts
router.get('/me', async (req, res) => {
  try {
    const payouts = await Payout.find({ userId: req.user.id })
      .populate('processedBy')
      .sort('-year -month');

    res.status(200).json({
      success: true,
      count: payouts.length,
      data: payouts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update payout status (mark as paid)
router.patch('/:id/status', authorize('payroll.update'), async (req, res) => {
  try {
    const { status, paymentMethod, transactionId, notes } = req.body;

    const updateData = {
      status,
      processedBy: req.user.id
    };

    if (status === 'paid') {
      updateData.paidOn = new Date();
      updateData.paymentMethod = paymentMethod;
      updateData.transactionId = transactionId;
    }

    if (notes) {
      updateData.notes = notes;
    }

    const payout = await Payout.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payout
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single payout
router.get('/:id', async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.id)
      .populate('userId')
      .populate('processedBy');

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }

    // Only allow users to view their own payouts unless they have payroll.read permission
    const hasPermission = req.user.roleIds.some(role =>
      role.permissions.payroll && role.permissions.payroll.read
    );

    if (!hasPermission && payout.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: payout
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

