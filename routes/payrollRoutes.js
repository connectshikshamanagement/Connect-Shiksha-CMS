const express = require('express');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Team = require('../models/Team');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Get all payroll records
router.get('/', authorize('finance.read'), async (req, res) => {
  try {
    const { month, teamId, status } = req.query;
    
    let query = {};
    if (month) query.month = month;
    if (teamId) query.teamId = teamId;
    if (status) query.status = status;

    const payrolls = await Payroll.find(query)
      .populate('userId', 'name email')
      .populate('teamId', 'name category')
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: payrolls.length,
      data: payrolls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get team-wise payroll summary
router.get('/summary/:month', authorize('finance.read'), async (req, res) => {
  try {
    const { month } = req.params;
    
    const summary = await Payroll.aggregate([
      {
        $match: { month }
      },
      {
        $group: {
          _id: '$teamId',
          totalAmount: { $sum: '$salaryAmount' },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$salaryAmount', 0]
            }
          },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$salaryAmount', 0]
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'teams',
          localField: '_id',
          foreignField: '_id',
          as: 'team'
        }
      },
      {
        $unwind: '$team'
      }
    ]);

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

// Create payroll record
router.post('/', authorize('finance.create'), async (req, res) => {
  try {
    const { userId, teamId, month, salaryAmount, notes } = req.body;

    // Check if user exists and is in the team
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Check if user is in the team
    if (!team.members.includes(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'User is not a member of the specified team' 
      });
    }

    const payroll = await Payroll.create({
      userId,
      teamId,
      month,
      salaryAmount,
      notes,
      createdBy: req.user.id
    });

    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate('userId', 'name email')
      .populate('teamId', 'name category')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedPayroll
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Payroll record already exists for this user and month'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update payroll record
router.put('/:id', authorize('finance.update'), async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('userId', 'name email')
     .populate('teamId', 'name category')
     .populate('createdBy', 'name email');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Mark payroll as paid
router.patch('/:id/pay', authorize('finance.update'), async (req, res) => {
  try {
    const { paymentMethod, transactionId } = req.body;

    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      {
        status: 'paid',
        paymentDate: new Date(),
        paymentMethod: paymentMethod || 'bank_transfer',
        transactionId
      },
      { new: true, runValidators: true }
    ).populate('userId', 'name email')
     .populate('teamId', 'name category')
     .populate('createdBy', 'name email');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete payroll record
router.delete('/:id', authorize('finance.delete'), async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndDelete(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
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