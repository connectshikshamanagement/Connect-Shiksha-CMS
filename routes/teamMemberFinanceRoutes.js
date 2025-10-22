const express = require('express');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Project = require('../models/Project');
const Team = require('../models/Team');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { computeProfitSharing } = require('../utils/profitSharing');

const router = express.Router();

router.use(protect);

// Team member routes for adding income/expense to assigned projects

// Add income for assigned project (Team Member)
router.post('/project-income', async (req, res) => {
  try {
    const { amount, source, description, projectId, date, sourceType } = req.body;

    if (!amount || !source || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'Amount, source, and project are required'
      });
    }

    // Verify user is assigned to this project
    const project = await Project.findById(projectId).populate('teamId');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is a member of the project's team
    const team = await Team.findById(project.teamId._id);
    if (!team || !team.members.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this project'
      });
    }

    // Create income entry
    const incomeData = {
      amount: parseFloat(amount),
      source: source,
      sourceType: sourceType || 'Product Sales', // Default to Product Sales if not provided
      description: description || '',
      date: date || new Date(),
      receivedByUserId: req.user.id,
      teamId: project.teamId._id,
      projectId: projectId,
      sourceRefId: projectId,
      sourceRefModel: 'Project',
      profitShared: false
    };

    const income = await Income.create(incomeData);

    // Automatically compute profit sharing
    await computeProfitSharing(income);

    // Trigger payroll recalculation for the project team
    await recalculateProjectPayroll(projectId);

    // Populate the response
    const populatedIncome = await Income.findById(income._id)
      .populate('receivedByUserId', 'name email')
      .populate('teamId', 'name category')
      .populate('sourceRefId', 'title');

    res.status(201).json({
      success: true,
      message: 'Income added successfully',
      data: populatedIncome
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add expense for assigned project (Team Member)
router.post('/project-expense', async (req, res) => {
  try {
    const { amount, category, description, projectId, date } = req.body;

    if (!amount || !category || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'Amount, category, and project are required'
      });
    }

    // Verify user is assigned to this project
    const project = await Project.findById(projectId).populate('teamId');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is a member of the project's team
    const team = await Team.findById(project.teamId._id);
    if (!team || !team.members.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this project'
      });
    }

    // Create expense entry
    const expenseData = {
      amount: parseFloat(amount),
      category: category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(), // Capitalize first letter
      description: description || '',
      date: date || new Date(),
      submittedBy: req.user.id,
      projectId: projectId,
      teamId: project.teamId._id,
      businessUnit: mapTeamCategoryToBusinessUnit(team.category), // Map team category to valid business unit
      status: 'approved' // Auto-approve for team members on their projects
    };

    const expense = await Expense.create(expenseData);

    // Trigger payroll recalculation for the project team
    await recalculateProjectPayroll(projectId);

    // Populate the response
    const populatedExpense = await Expense.findById(expense._id)
      .populate('submittedBy', 'name email')
      .populate('projectId', 'title')
      .populate('teamId', 'name category');

    res.status(201).json({
      success: true,
      message: 'Expense added successfully',
      data: populatedExpense
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get team member's assigned projects
router.get('/my-projects', async (req, res) => {
  try {
    // Find teams where user is a member
    const userTeams = await Team.find({ members: req.user.id }).select('_id');
    const teamIds = userTeams.map(team => team._id);

    // Find projects for these teams
    const projects = await Project.find({ teamId: { $in: teamIds } })
      .populate('teamId', 'name category')
      .select('title teamId allocatedBudget');

    res.status(200).json({
      success: true,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get team member's income history
router.get('/my-income-history', async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    
    // Find teams where user is a member
    const userTeams = await Team.find({ members: req.user.id }).select('_id');
    const teamIds = userTeams.map(team => team._id);

    let query = {
      teamId: { $in: teamIds },
      receivedByUserId: req.user.id  // Only show records created by this user
    };

    // Filter by project if specified
    if (projectId) {
      query.sourceRefId = projectId;
      query.sourceRefModel = 'Project';
    }

    // Filter by date range if specified
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const incomeHistory = await Income.find(query)
      .populate('receivedByUserId', 'name email')
      .populate('teamId', 'name category')
      .populate('sourceRefId', 'title')
      .sort('-date');

    res.status(200).json({
      success: true,
      count: incomeHistory.length,
      data: incomeHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get team member's expense history
router.get('/my-expense-history', async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    
    // Find teams where user is a member
    const userTeams = await Team.find({ members: req.user.id }).select('_id');
    const teamIds = userTeams.map(team => team._id);

    let query = {
      teamId: { $in: teamIds },
      submittedBy: req.user.id  // Only show records created by this user
    };

    // Filter by project if specified
    if (projectId) {
      query.projectId = projectId;
    }

    // Filter by date range if specified
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const expenseHistory = await Expense.find(query)
      .populate('submittedBy', 'name email')
      .populate('projectId', 'title')
      .populate('teamId', 'name category')
      .sort('-date');

    res.status(200).json({
      success: true,
      count: expenseHistory.length,
      data: expenseHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to recalculate payroll for a project team
async function recalculateProjectPayroll(projectId) {
  try {
    const project = await Project.findById(projectId).populate('teamId');
    if (!project) return;

    const team = project.teamId;
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    // Get all team members
    const teamMembers = await User.find({ 
      _id: { $in: team.members },
      active: true 
    });

    // Calculate project financials
    const projectIncome = await Income.find({
      sourceRefId: projectId,
      sourceRefModel: 'Project',
      date: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1)
      }
    });

    const projectExpenses = await Expense.find({
      projectId: projectId,
      date: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1)
      }
    });

    const totalIncome = projectIncome.reduce((sum, inc) => sum + inc.amount, 0);
    const totalExpenses = projectExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    // Update or create payroll records for each team member
    for (const member of teamMembers) {
      const existingPayroll = await Payroll.findOne({
        userId: member._id,
        month: month,
        year: year
      });

      if (existingPayroll) {
        // Update existing payroll with new project data
        existingPayroll.projectIncome = totalIncome;
        existingPayroll.projectExpenses = totalExpenses;
        existingPayroll.projectBudget = project.allocatedBudget;
        existingPayroll.netProfit = netProfit;
        await existingPayroll.save();
      } else {
        // Create new payroll record
        await Payroll.create({
          userId: member._id,
          teamId: team._id,
          projectId: projectId,
          month: month,
          year: year,
          projectIncome: totalIncome,
          projectExpenses: totalExpenses,
          projectBudget: project.allocatedBudget,
          netProfit: netProfit,
          status: 'pending'
        });
      }
    }

    console.log(`Payroll recalculated for project ${project.title} (${team.name})`);
  } catch (error) {
    console.error('Error recalculating project payroll:', error);
  }
}

// Helper function to map team category to valid business unit
function mapTeamCategoryToBusinessUnit(teamCategory) {
  const mapping = {
    'Coaching': 'Coaching',
    'IOT': 'IOT',
    'Robotics': 'Robotics',
    'Media': 'Media',
    'Workshop': 'Workshop',
    'Guest Lectures': 'GuestLectures',
    'Funding & Innovation': 'Other',
    'Development': 'Other',
    'Marketing': 'Other',
    'Sales': 'Other',
    'Support': 'Other'
  };
  
  return mapping[teamCategory] || 'Other';
}

module.exports = router;
