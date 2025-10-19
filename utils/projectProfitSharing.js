const Project = require('../models/Project');
const User = require('../models/User');
const Role = require('../models/Role');
const Payroll = require('../models/Payroll');
const Income = require('../models/Income');
const Expense = require('../models/Expense');

// Compute project-based profit sharing (70% Founder, 30% shared among eligible members)
exports.computeProjectProfitSharing = async (projectId) => {
  try {
    console.log(`🔄 Computing profit sharing for project: ${projectId}`);

    // Find project with related data
    const project = await Project.findById(projectId)
      .populate('teamId')
      .populate('projectMembers');

    if (!project) {
      throw new Error('Project not found');
    }

    // Get all income and expense records for this project
    const incomeRecords = await Income.find({ 
      sourceRefId: projectId,
      sourceRefModel: 'Project'
    });

    const expenseRecords = await Expense.find({ 
      projectId: projectId 
    });

    // Calculate project profit
    const totalIncome = incomeRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalExpense = expenseRecords.reduce((sum, record) => sum + record.amount, 0);
    const profit = totalIncome - totalExpense;

    console.log(`📊 Project ${project.title}: Income: ₹${totalIncome}, Expense: ₹${totalExpense}, Profit: ₹${profit}`);

    if (profit <= 0) {
      console.log('⚠️ No profit to distribute');
      return { profit, founderShare: 0, sharePerPerson: 0, eligibleCount: 0 };
    }

    // Get role IDs
    const founderRole = await Role.findOne({ key: 'FOUNDER' });
    const managerRole = await Role.findOne({ key: 'TEAM_MANAGER' });
    const memberRole = await Role.findOne({ key: 'TEAM_MEMBER' });

    // Calculate shares
    const founderShare = profit * 0.7;
    const remainingPool = profit * 0.3;

    // Find eligible users
    const eligibleUsers = [];

    // Add founder
    const founder = await User.findOne({ 
      roleIds: { $in: [founderRole._id] },
      active: true 
    });

    if (founder) {
      eligibleUsers.push({
        user: founder,
        shareAmount: founderShare,
        description: `70% CS Profit from ${project.title}`,
        isFounder: true
      });
    }

    // Add eligible team managers (all active managers)
    const eligibleManagers = await User.find({
      roleIds: { $in: [managerRole._id] },
      active: true
    });

    eligibleManagers.forEach(manager => {
      eligibleUsers.push({
        user: manager,
        shareAmount: 0, // Will be calculated after counting all eligible
        description: `Team Manager Share from ${project.title}`,
        isFounder: false,
        isManager: true
      });
    });

    // Add eligible team members (only those assigned to this project)
    const eligibleMembers = await User.find({
      _id: { $in: project.projectMembers },
      roleIds: { $in: [memberRole._id] },
      active: true
    });

    eligibleMembers.forEach(member => {
      eligibleUsers.push({
        user: member,
        shareAmount: 0, // Will be calculated after counting all eligible
        description: `Team Member Share from ${project.title}`,
        isFounder: false,
        isManager: false
      });
    });

    // Calculate equal share for non-founder eligible users
    const nonFounderCount = eligibleUsers.filter(u => !u.isFounder).length;
    const sharePerPerson = nonFounderCount > 0 ? remainingPool / nonFounderCount : 0;

    // Update share amounts for non-founder users
    eligibleUsers.forEach(eligibleUser => {
      if (!eligibleUser.isFounder) {
        eligibleUser.shareAmount = sharePerPerson;
      }
    });

    console.log(`👥 Eligible users: ${eligibleUsers.length} (Founder: 1, Others: ${nonFounderCount})`);

    // Create payroll records
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const payrollRecords = [];

    for (const eligibleUser of eligibleUsers) {
      // Check if payroll record already exists for this user/month
      let existingPayroll = await Payroll.findOne({
        userId: eligibleUser.user._id,
        month: `${year}-${month.toString().padStart(2, '0')}`,
        projectId: projectId
      });

      if (existingPayroll) {
        // Replace existing record instead of adding to it
        existingPayroll.profitShare = eligibleUser.shareAmount;
        existingPayroll.description = eligibleUser.description;
        await existingPayroll.save();
        console.log(`📝 Updated payroll for ${eligibleUser.user.name}: ₹${eligibleUser.shareAmount}`);
      } else {
        // Create new payroll record
        const userSalary = eligibleUser.user.salary || 0;
        
        const newPayroll = new Payroll({
          userId: eligibleUser.user._id,
          teamId: project.teamId._id,
          projectId: projectId,
          month: `${year}-${month.toString().padStart(2, '0')}`,
          year: year,
          baseSalary: userSalary,
          profitShare: eligibleUser.shareAmount,
          bonuses: 0,
          deductions: 0,
          status: 'pending',
          description: eligibleUser.description,
          createdBy: founder ? founder._id : eligibleUser.user._id
        });

        await newPayroll.save();
        payrollRecords.push(newPayroll);
        console.log(`✅ Created payroll for ${eligibleUser.user.name}: ₹${eligibleUser.shareAmount}`);
      }
    }

    // Mark income records as profit shared
    await Income.updateMany(
      { _id: { $in: incomeRecords.map(r => r._id) } },
      { profitShared: true }
    );

    console.log(`🎉 Profit sharing completed for project: ${project.title}`);
    console.log(`💰 Founder share: ₹${founderShare}`);
    console.log(`👥 Share per person (${nonFounderCount}): ₹${sharePerPerson}`);

    return {
      project: project.title,
      profit,
      founderShare,
      sharePerPerson,
      eligibleCount: eligibleUsers.length,
      payrollRecords: payrollRecords.length
    };

  } catch (error) {
    console.error('❌ Error computing project profit sharing:', error);
    throw error;
  }
};

// Get project profit summary
exports.getProjectProfitSummary = async (projectId) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const incomeRecords = await Income.find({ 
      sourceRefId: projectId,
      sourceRefModel: 'Project'
    });

    const expenseRecords = await Expense.find({ 
      projectId: projectId 
    });

    const totalIncome = incomeRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalExpense = expenseRecords.reduce((sum, record) => sum + record.amount, 0);
    const profit = totalIncome - totalExpense;

    return {
      project: project.title,
      totalIncome,
      totalExpense,
      profit,
      incomeCount: incomeRecords.length,
      expenseCount: expenseRecords.length
    };

  } catch (error) {
    console.error('❌ Error getting project profit summary:', error);
    throw error;
  }
};

// Trigger profit sharing for all active projects
exports.computeAllProjectsProfitSharing = async () => {
  try {
    console.log('🚀 Computing profit sharing for all active projects...');

    const activeProjects = await Project.find({ 
      status: { $in: ['active', 'completed'] } 
    });

    const results = [];

    for (const project of activeProjects) {
      try {
        const result = await exports.computeProjectProfitSharing(project._id);
        results.push(result);
      } catch (error) {
        console.error(`❌ Error processing project ${project.title}:`, error);
        results.push({
          project: project.title,
          error: error.message
        });
      }
    }

    console.log(`✅ Completed profit sharing for ${results.length} projects`);
    return results;

  } catch (error) {
    console.error('❌ Error computing all projects profit sharing:', error);
    throw error;
  }
};