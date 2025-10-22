const express = require('express');
const AdvancePayment = require('../models/AdvancePayment');
const User = require('../models/User');
const Team = require('../models/Team');
const Project = require('../models/Project');
const Payroll = require('../models/Payroll');
const { protect, authorize } = require('../middleware/auth');
const { restrictToRole, restrictToRoles } = require('../middleware/roleAccess');

const router = express.Router();

// Get all advance payment requests (Founder/Manager only)
router.get('/', protect, restrictToRoles(['FOUNDER', 'TEAM_MANAGER']), async (req, res) => {
  try {
    const { status, teamId, userId } = req.query;
    const userRole = req.user.roleIds[0]?.key;
    
    let query = {};
    
    // Team managers can only see requests from their teams
    if (userRole === 'TEAM_MANAGER') {
      const userTeams = await Team.find({ members: req.user.id }).select('_id');
      const teamIds = userTeams.map(team => team._id);
      query.teamId = { $in: teamIds };
    }
    
    if (status) query.status = status;
    if (teamId) query.teamId = teamId;
    if (userId) query.userId = userId;

    const requests = await AdvancePayment.find(query)
      .populate('userId', 'name email')
      .populate('teamId', 'name category')
      .populate('projectId', 'title')
      .populate('reviewedBy', 'name email')
      .sort('-requestedAt');

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get my advance payment requests (Team Member)
router.get('/my-requests', protect, async (req, res) => {
  try {
    const requests = await AdvancePayment.find({ userId: req.user.id })
      .populate('teamId', 'name category')
      .populate('projectId', 'title')
      .populate('reviewedBy', 'name email')
      .sort('-requestedAt');

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create advance payment request (Team Member)
router.post('/', protect, async (req, res) => {
  try {
    const { amount, reason, projectId, deductedFrom } = req.body;
    
    if (!amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Amount and reason are required'
      });
    }

    // Get user's team
    const userTeams = await Team.find({ members: req.user.id }).select('_id name');
    if (userTeams.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User is not assigned to any team'
      });
    }

    // Use first team if multiple teams
    const teamId = userTeams[0]._id;

    const advanceRequest = await AdvancePayment.create({
      userId: req.user.id,
      teamId,
      projectId: projectId || null,
      amount,
      reason,
      deductedFrom: deductedFrom || 'profit_share'
    });

    const populatedRequest = await AdvancePayment.findById(advanceRequest._id)
      .populate('userId', 'name email')
      .populate('teamId', 'name category')
      .populate('projectId', 'title');

    // Emit socket event for real-time notification
    const io = req.app.get('io');
    if (io) {
      io.emit('advance-payment:requested', populatedRequest);
    }

    res.status(201).json({
      success: true,
      data: populatedRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Approve/Reject advance payment request (Founder/Manager only)
router.patch('/:id/status', protect, restrictToRoles(['FOUNDER', 'TEAM_MANAGER']), async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved or rejected'
      });
    }

    const request = await AdvancePayment.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Advance payment request not found'
      });
    }

    // Check if user has permission to review this request
    const userRole = req.user.roleIds[0]?.key;
    if (userRole === 'TEAM_MANAGER') {
      const team = await Team.findById(request.teamId);
      if (!team.members.includes(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'You can only review requests from your team'
        });
      }
    }

    request.status = status;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.reviewNotes = reviewNotes;

    await request.save();

    // If approved, update payroll records
    if (status === 'approved') {
      await updatePayrollWithAdvancePayment(request);
    }

    const populatedRequest = await AdvancePayment.findById(request._id)
      .populate('userId', 'name email')
      .populate('teamId', 'name category')
      .populate('projectId', 'title')
      .populate('reviewedBy', 'name email');

    // Emit socket event for real-time notification
    const io = req.app.get('io');
    if (io) {
      io.emit('advance-payment:statusChanged', populatedRequest);
    }

    res.status(200).json({
      success: true,
      data: populatedRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to update payroll with advance payment
async function updatePayrollWithAdvancePayment(request) {
  try {
    // Find the user's payroll records
    const payrollRecords = await Payroll.find({ 
      userId: request.userId,
      status: { $ne: 'done' }
    });

    let remainingAmount = request.amount;

    for (const payroll of payrollRecords) {
      if (remainingAmount <= 0) break;

      if (request.deductedFrom === 'profit_share') {
        const deductableAmount = Math.min(remainingAmount, payroll.profitShare || 0);
        payroll.profitShare = Math.max(0, (payroll.profitShare || 0) - deductableAmount);
        payroll.netAmount = (payroll.baseSalary || 0) + payroll.profitShare + (payroll.bonuses || 0) - (payroll.deductions || 0);
        remainingAmount -= deductableAmount;
      } else {
        // Deduct from future salary
        const deductableAmount = Math.min(remainingAmount, payroll.baseSalary || 0);
        payroll.baseSalary = Math.max(0, (payroll.baseSalary || 0) - deductableAmount);
        payroll.netAmount = payroll.baseSalary + (payroll.profitShare || 0) + (payroll.bonuses || 0) - (payroll.deductions || 0);
        remainingAmount -= deductableAmount;
      }

      await payroll.save();
    }
  } catch (error) {
    console.error('Error updating payroll with advance payment:', error);
  }
}

// Get advance payment statistics
router.get('/stats', protect, restrictToRoles(['FOUNDER', 'TEAM_MANAGER']), async (req, res) => {
  try {
    const userRole = req.user.roleIds[0]?.key;
    let teamFilter = {};
    
    if (userRole === 'TEAM_MANAGER') {
      const userTeams = await Team.find({ members: req.user.id }).select('_id');
      const teamIds = userTeams.map(team => team._id);
      teamFilter.teamId = { $in: teamIds };
    }

    const stats = await AdvancePayment.aggregate([
      { $match: teamFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const formattedStats = {
      pending: { count: 0, totalAmount: 0 },
      approved: { count: 0, totalAmount: 0 },
      rejected: { count: 0, totalAmount: 0 }
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount
      };
    });

    res.status(200).json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
