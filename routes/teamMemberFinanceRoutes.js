const express = require('express');
const mongoose = require('mongoose');
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

    // Check if user is a member of the project's team, team lead, or project manager
    const team = await Team.findById(project.teamId?._id || project.teamId);
    const Role = require('../models/Role');
    const user = await User.findById(req.user.id).populate('roleIds');
    const isFounder = user.roleIds.some(role => role.key === 'FOUNDER');
    const isProjectManager = user.roleIds.some(role => role.key === 'PROJECT_MANAGER');
    const userIdString = req.user.id.toString();
    const isTeamMember = team?.members?.some(member => member.toString() === userIdString);
    const isTeamLead = team?.leadUserId && team.leadUserId.toString() === userIdString;
    const isProjectOwner = project.ownerId && project.ownerId.toString() === userIdString;
    const isProjectMember = (project.projectMembers || []).some(member => member.toString() === userIdString);
    const isActiveProjectMember = (project.memberDetails || []).some(detail => {
      if (!detail?.userId) return false;
      return detail.userId.toString() === userIdString && detail.isActive !== false;
    });
    
    if (!team || (!isFounder && !isProjectManager && !isTeamMember && !isTeamLead && !isProjectOwner && !isProjectMember && !isActiveProjectMember)) {
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
      sourceRefId: projectId,
      sourceRefModel: 'Project',
      profitShared: false
    };

    const income = await Income.create(incomeData);

    // Automatically compute profit sharing
    console.log('=== COMPUTING PROFIT SHARING FOR TEAM MEMBER INCOME ===');
    console.log('Income ID:', income._id);
    console.log('Source Type:', income.sourceType);
    console.log('Amount:', income.amount);
    console.log('Team ID:', income.teamId);
    console.log('Project ID:', income.sourceRefId);
    
    // Use our new recalculateProjectPayroll function instead of the old computeProfitSharing
    console.log('✅ Income added successfully, triggering payroll recalculation');
    console.log('🔍 About to call recalculateProjectPayroll with projectId:', projectId);

    // Trigger payroll recalculation for the project team
    console.log(`🚀 About to recalculate payroll for project: ${projectId}`);
    try {
      await recalculateProjectPayroll(projectId);
      console.log(`✅ Completed recalculating payroll for project: ${projectId}`);
    } catch (error) {
      console.error(`❌ Error recalculating payroll for project ${projectId}:`, error.message);
    }

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

    // Check if user is a member of the project's team, team lead, or project manager
    const team = await Team.findById(project.teamId?._id || project.teamId);
    const Role = require('../models/Role');
    const user = await User.findById(req.user.id).populate('roleIds');
    const isFounder = user.roleIds.some(role => role.key === 'FOUNDER');
    const isProjectManager = user.roleIds.some(role => role.key === 'PROJECT_MANAGER');
    const userIdString = req.user.id.toString();
    const isTeamMember = team?.members?.some(member => member.toString() === userIdString);
    const isTeamLead = team?.leadUserId && team.leadUserId.toString() === userIdString;
    const isProjectOwner = project.ownerId && project.ownerId.toString() === userIdString;
    const isProjectMember = (project.projectMembers || []).some(member => member.toString() === userIdString);
    const isActiveProjectMember = (project.memberDetails || []).some(detail => {
      if (!detail?.userId) return false;
      return detail.userId.toString() === userIdString && detail.isActive !== false;
    });
    
    if (!team || (!isFounder && !isProjectManager && !isTeamMember && !isTeamLead && !isProjectOwner && !isProjectMember && !isActiveProjectMember)) {
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
    console.log(`🚀 About to recalculate payroll for project: ${projectId}`);
    try {
      await recalculateProjectPayroll(projectId);
      console.log(`✅ Completed recalculating payroll for project: ${projectId}`);
    } catch (error) {
      console.error(`❌ Error recalculating payroll for project ${projectId}:`, error.message);
    }

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

// Get team member's assigned projects (also includes manager's projects)
router.get('/my-projects', async (req, res) => {
  try {
    const Role = require('../models/Role');
    const user = await User.findById(req.user.id).populate('roleIds');
    const isFounder = user.roleIds.some(role => role.key === 'FOUNDER');
    
    let teamIds = [];
    let projectQuery = {};
    
    if (isFounder) {
      // Founders can see all projects
      projectQuery = {};
    } else {
      // Find teams where user is a member or team lead
      const userTeams = await Team.find({ 
        $or: [
          { members: req.user.id },
          { leadUserId: req.user.id }
        ]
      }).select('_id');
      teamIds = userTeams.map(team => team._id);

      // Find projects for these teams OR projects owned by the user OR projects where user is a member
      // Also include projects where the user is a team lead of the project's team
      projectQuery = {
        $or: [
          { teamId: { $in: teamIds } },
          { ownerId: req.user.id },
          { projectMembers: req.user.id }
        ]
      };
      
      // If user is a team lead, also include projects from teams they lead
      if (teamIds.length > 0) {
        // This is already covered by teamId: { $in: teamIds }, but we ensure it's working
        console.log(`🔍 User ${req.user.id} is in teams: ${teamIds.map(t => t.toString()).join(', ')}`);
      }
    }

    // Find projects for these teams
    const projects = await Project.find(projectQuery)
      .populate('teamId', 'name category')
      .populate('ownerId', 'name email')
      .select('title teamId allocatedBudget ownerId projectMembers');

    // Log for debugging
    console.log(`📋 Found ${projects.length} projects for user ${req.user.id}`);
    projects.forEach(p => {
      const ownerName = p.ownerId?.name || (typeof p.ownerId === 'string' ? p.ownerId : 'N/A');
      const teamName = p.teamId?.name || 'N/A';
      console.log(`  - ${p.title} (Team: ${teamName}, Owner: ${ownerName}, Members: ${p.projectMembers?.length || 0})`);
    });

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

// Get team member's income history (also includes manager's income history)
router.get('/my-income-history', async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    
    const Role = require('../models/Role');
    const user = await User.findById(req.user.id).populate('roleIds');
    const isFounder = user.roleIds.some(role => role.key === 'FOUNDER');
    
    let teamIds = [];
    let query = {};
    
    if (isFounder) {
      // Founders can see all income records they created
      query = {
        receivedByUserId: new mongoose.Types.ObjectId(req.user.id)
      };
    } else {
      // Find teams where user is a member, team lead, or project manager
      const userTeams = await Team.find({ 
        $or: [
          { members: req.user.id },
          { leadUserId: req.user.id }
        ]
      }).select('_id');
      teamIds = userTeams.map(team => team._id);
      
      // Also get projects owned by the user
      const ownedProjects = await Project.find({ ownerId: req.user.id }).select('_id');
      const ownedProjectIds = ownedProjects.map(p => p._id);

      query = {
        $or: [
          { teamId: { $in: teamIds }, receivedByUserId: new mongoose.Types.ObjectId(req.user.id) },
          { sourceRefId: { $in: ownedProjectIds }, sourceRefModel: 'Project', receivedByUserId: new mongoose.Types.ObjectId(req.user.id) }
        ]
      };
    }

    // Filter by project if specified
    if (projectId) {
      if (query.$or) {
        // Add project filter to each condition in $or
        query.$or = query.$or.map(condition => ({
          ...condition,
          sourceRefId: new mongoose.Types.ObjectId(projectId),
          sourceRefModel: 'Project'
        }));
      } else {
        query.sourceRefId = new mongoose.Types.ObjectId(projectId);
        query.sourceRefModel = 'Project';
      }
    }

    // Filter by date range if specified
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      
      if (query.$or) {
        query.$or = query.$or.map(condition => ({
          ...condition,
          date: dateFilter
        }));
      } else {
        query.date = dateFilter;
      }
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

// Get team member's expense history (also includes manager's expense history)
router.get('/my-expense-history', async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    
    const Role = require('../models/Role');
    const user = await User.findById(req.user.id).populate('roleIds');
    const isFounder = user.roleIds.some(role => role.key === 'FOUNDER');
    
    let teamIds = [];
    let query = {};
    
    if (isFounder) {
      // Founders can see all expense records they created
      query = {
        submittedBy: new mongoose.Types.ObjectId(req.user.id)
      };
    } else {
      // Find teams where user is a member, team lead, or project manager
      const userTeams = await Team.find({ 
        $or: [
          { members: req.user.id },
          { leadUserId: req.user.id }
        ]
      }).select('_id');
      teamIds = userTeams.map(team => team._id);
      
      // Also get projects owned by the user
      const ownedProjects = await Project.find({ ownerId: req.user.id }).select('_id');
      const ownedProjectIds = ownedProjects.map(p => p._id);

      query = {
        $or: [
          { teamId: { $in: teamIds }, submittedBy: new mongoose.Types.ObjectId(req.user.id) },
          { projectId: { $in: ownedProjectIds }, submittedBy: new mongoose.Types.ObjectId(req.user.id) }
        ]
      };
    }

    // Filter by project if specified
    if (projectId) {
      if (query.$or) {
        // Add project filter to each condition in $or
        query.$or = query.$or.map(condition => ({
          ...condition,
          projectId: new mongoose.Types.ObjectId(projectId)
        }));
      } else {
        query.projectId = new mongoose.Types.ObjectId(projectId);
      }
    }

    // Filter by date range if specified
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      
      if (query.$or) {
        query.$or = query.$or.map(condition => ({
          ...condition,
          date: dateFilter
        }));
      } else {
        query.date = dateFilter;
      }
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
    console.log(`🔄 Recalculating payroll for project: ${projectId}`);
    const project = await Project.findById(projectId).populate('teamId');
    if (!project) {
      console.log(`❌ Project not found: ${projectId}`);
      return;
    }

    const team = project.teamId;
    const currentDate = new Date();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const year = currentDate.getFullYear();
    const monthYear = `${year}-${month}`;

    // Get project-specific members (if project has specific members) or fall back to team members
    let memberIds = project.projectMembers && project.projectMembers.length > 0 
      ? project.projectMembers 
      : team.members;
    
    const teamMembers = await User.find({ 
      _id: { $in: memberIds },
      active: true 
    });

    console.log(`👥 Project ${project.title} members: ${teamMembers.map(m => m.name).join(', ')} (${teamMembers.length} total)`);

    // Calculate project financials for the specific month
    const projectIncome = await Income.find({
      sourceRefId: projectId,
      sourceRefModel: 'Project'
      // Remove date filtering to get all income for this project
    });

    const projectExpenses = await Expense.find({
      projectId: projectId
      // Remove date filtering to get all expenses for this project
    });

    const totalIncome = projectIncome.reduce((sum, inc) => sum + inc.amount, 0);
    const totalExpenses = projectExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    
    console.log(`📊 Project ${project.title}: Income: ₹${totalIncome}, Expenses: ₹${totalExpenses}, Profit: ₹${netProfit}`);

    // Find founder to determine profit share
    const Role = require('../models/Role');
    const founderRole = await Role.findOne({ key: 'FOUNDER' });
    const founder = await User.findOne({ 
      roleIds: { $in: [founderRole._id] },
      active: true 
    });
    
    // Calculate profit sharing: 70% to founder, 30% shared among eligible members
    const founderShare = netProfit * 0.7;
    const teamShare = netProfit * 0.3;
    
    // Count eligible members (all team members in this function are already part of project)
    const eligibleCount = teamMembers.length;
    const sharePerPerson = eligibleCount > 0 ? teamShare / eligibleCount : 0;
    
    // Update or create payroll records for each team member
    for (const member of teamMembers) {
      const existingPayroll = await Payroll.findOne({
        userId: member._id,
        projectId: projectId,
        month: monthYear
      });

      if (existingPayroll) {
        // Update existing payroll with new project data
        existingPayroll.projectIncome = totalIncome;
        existingPayroll.projectExpenses = totalExpenses;
        existingPayroll.projectBudget = project.allocatedBudget || 0;
        existingPayroll.netProfit = netProfit;
        
        // Determine profit share based on user role
        const memberRoles = await User.findById(member._id).populate('roleIds');
        if (memberRoles.roleIds && memberRoles.roleIds.some(role => role.key === 'FOUNDER')) {
          existingPayroll.profitShare = founderShare;
        } else {
          // All other members (managers and team members) share 30% equally
          existingPayroll.profitShare = sharePerPerson;
        }
        
        await existingPayroll.save();
        console.log(`📝 Updated payroll for ${member.name}: ₹${existingPayroll.profitShare}`);
      } else {
        // Create new payroll record
        const memberRoles = await User.findById(member._id).populate('roleIds');
        let profitShareAmount = 0;
        
        if (memberRoles.roleIds && memberRoles.roleIds.some(role => role.key === 'FOUNDER')) {
          profitShareAmount = founderShare;
        } else {
          // All other members share 30% equally
          profitShareAmount = sharePerPerson;
        }
        
        await Payroll.create({
          userId: member._id,
          teamId: team._id,
          projectId: projectId,
          month: monthYear,
          year: year,
          projectIncome: totalIncome,
          projectExpenses: totalExpenses,
          projectBudget: project.allocatedBudget || 0,
          netProfit: netProfit,
          profitShare: profitShareAmount,
          status: 'pending',
          createdBy: member._id // Use member ID as creator for team member payroll
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
