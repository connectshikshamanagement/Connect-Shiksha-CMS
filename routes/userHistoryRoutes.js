const express = require('express');
const User = require('../models/User');
const Task = require('../models/Task');
const Expense = require('../models/Expense');
const Payroll = require('../models/Payroll');
const Team = require('../models/Team');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Get user history
router.get('/:id/history', async (req, res) => {
  try {
    const userId = req.params.id;
    const { type, startDate, endDate } = req.query;

    // Check if user can access this history
    const isFounder = (req.user.roleIds || []).some((r) => r.key === 'FOUNDER');
    const isTeamLead = await Team.findOne({ 
      leadUserId: req.user.id,
      members: userId 
    });

    if (!isFounder && !isTeamLead && String(req.user.id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own history.'
      });
    }

    const user = await User.findById(userId)
      .populate('teamHistory.teamId', 'name category')
      .populate('taskHistory.taskId', 'title status deadline')
      .populate('expenseHistory.expenseId', 'amount category description status')
      .populate('payrollHistory.payrollId', 'month salaryAmount status paymentDate');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let history = {};

    // Filter by type if specified
    if (type === 'teams' || !type) {
      history.teamHistory = user.teamHistory || [];
      if (startDate && endDate) {
        history.teamHistory = history.teamHistory.filter(entry => 
          entry.joinedOn >= new Date(startDate) && entry.joinedOn <= new Date(endDate)
        );
      }
    }

    if (type === 'tasks' || !type) {
      history.taskHistory = user.taskHistory || [];
      if (startDate && endDate) {
        history.taskHistory = history.taskHistory.filter(entry => 
          entry.assignedOn >= new Date(startDate) && entry.assignedOn <= new Date(endDate)
        );
      }
    }

    if (type === 'expenses' || !type) {
      history.expenseHistory = user.expenseHistory || [];
      if (startDate && endDate) {
        history.expenseHistory = history.expenseHistory.filter(entry => 
          entry.date >= new Date(startDate) && entry.date <= new Date(endDate)
        );
      }
    }

    if (type === 'payroll' || !type) {
      history.payrollHistory = user.payrollHistory || [];
      if (startDate && endDate) {
        history.payrollHistory = history.payrollHistory.filter(entry => 
          entry.paymentDate && entry.paymentDate >= new Date(startDate) && entry.paymentDate <= new Date(endDate)
        );
      }
    }

    // Calculate summary statistics
    const summary = {
      totalTasks: history.taskHistory?.length || 0,
      completedTasks: history.taskHistory?.filter(t => t.status === 'done').length || 0,
      totalExpenses: history.expenseHistory?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
      totalPayroll: history.payrollHistory?.reduce((sum, p) => sum + (p.salaryAmount || 0), 0) || 0,
      activeTeams: history.teamHistory?.filter(t => t.isActive).length || 0,
      totalTeams: history.teamHistory?.length || 0
    };

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        history,
        summary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user performance metrics
router.get('/:id/performance', async (req, res) => {
  try {
    const userId = req.params.id;
    const { month, year } = req.query;

    // Check access permissions
    const isFounder = (req.user.roleIds || []).some((r) => r.key === 'FOUNDER');
    const isTeamLead = await Team.findOne({ 
      leadUserId: req.user.id,
      members: userId 
    });

    if (!isFounder && !isTeamLead && String(req.user.id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get current month if not specified
    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1);
    const targetYear = year || currentDate.getFullYear();

    // Calculate date range
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    // Get task performance
    const tasks = await Task.find({
      assignedTo: userId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Get expense performance
    const expenses = await Expense.find({
      submittedBy: userId,
      date: { $gte: startDate, $lte: endDate }
    });

    // Get payroll information
    const payroll = await Payroll.find({
      userId: userId,
      month: `${targetYear}-${String(targetMonth).padStart(2, '0')}`
    });

    // Calculate metrics
    const performance = {
      tasks: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'done').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        overdue: tasks.filter(t => t.deadline < new Date() && t.status !== 'done').length,
        completionRate: tasks.length > 0 ? (tasks.filter(t => t.status === 'done').length / tasks.length) * 100 : 0
      },
      expenses: {
        total: expenses.length,
        totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0)
      },
      payroll: {
        total: payroll.length,
        totalAmount: payroll.reduce((sum, p) => sum + p.salaryAmount, 0),
        paid: payroll.filter(p => p.status === 'paid').length,
        pending: payroll.filter(p => p.status === 'pending').length
      }
    };

    res.status(200).json({
      success: true,
      data: {
        userId,
        period: `${targetMonth}/${targetYear}`,
        performance
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
