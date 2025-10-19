const Project = require('../models/Project');
const Payout = require('../models/Payout');
const User = require('../models/User');
const Team = require('../models/Team');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Role = require('../models/Role');

// Compute project-based profit sharing
exports.computeProjectProfitSharing = async (projectId) => {
  try {
    console.log(`🔄 Computing project-based profit sharing for project: ${projectId}`);

    // Get project details
    const project = await Project.findById(projectId)
      .populate('teamId', 'name members')
      .populate('ownerId', 'name');

    if (!project) {
      console.log(`❌ Project not found: ${projectId}`);
      return;
    }

    console.log(`📊 Project: ${project.title} (Team: ${project.teamId?.name})`);

    // Calculate project profit = Total Income - Total Expenses
    const projectIncome = await Income.find({
      sourceRefId: project._id,
      sourceRefModel: 'Project',
      profitShared: { $ne: true }
    });

    console.log(`📊 Found ${projectIncome.length} income records for project ${project.title}:`);
    projectIncome.forEach(income => {
      console.log(`   - ${income.sourceType}: ₹${income.amount.toLocaleString()}`);
    });

    const projectExpenses = await Expense.find({
      projectId: projectId
    });

    const totalIncome = projectIncome.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = projectExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Profit sharing based ONLY on actual income minus expenses (not budget or deal amount)
    const projectProfit = totalIncome - totalExpenses;

    console.log(`💰 Project Financials:`);
    console.log(`   Total Income: ₹${totalIncome.toLocaleString()}`);
    console.log(`   Total Expenses: ₹${totalExpenses.toLocaleString()}`);
    console.log(`   Project Profit (Income - Expenses): ₹${projectProfit.toLocaleString()}`);
    
    // Show deal amount and budget for reference only (not used in profit calculation)
    if (project.totalDealAmount > 0) {
      console.log(`   Deal Amount (Reference): ₹${project.totalDealAmount.toLocaleString()}`);
      console.log(`   Deal Collection: ${Math.round((totalIncome / project.totalDealAmount) * 100)}%`);
    }
    if (project.budget > 0) {
      console.log(`   Budget (Reference): ₹${project.budget.toLocaleString()}`);
      console.log(`   Budget Utilization: ${Math.round((totalExpenses / project.budget) * 100)}%`);
    }

    if (projectProfit <= 0) {
      console.log(`⚠️ No profit to distribute for project: ${project.title}`);
      return;
    }

    // Get project-specific members (if any) or fall back to team members
    let projectMembers = [];
    
    if (project.projectMembers && project.projectMembers.length > 0) {
      // Use project-specific members
      projectMembers = await User.find({
        _id: { $in: project.projectMembers },
        active: true
      });
      console.log(`👥 Project Members (${projectMembers.length}):`);
    } else {
      // Fall back to team members
      projectMembers = await User.find({
        _id: { $in: project.teamId.members },
        active: true
      });
      console.log(`👥 Team Members (${projectMembers.length}):`);
    }

    projectMembers.forEach(member => {
      console.log(`   - ${member.name} (${member.email})`);
    });

    if (projectMembers.length === 0) {
      console.log(`❌ No active project members found for project: ${project.title}`);
      return;
    }

    // Get Founder user
    const founder = await User.findOne({ 
      roleIds: { $elemMatch: { $exists: true } },
      active: true
    }).populate('roleIds');

    const founderRole = founder?.roleIds?.find(role => role.key === 'FOUNDER');
    const founderUser = founderRole ? founder : null;

    if (!founderUser) {
      console.log(`❌ Founder not found for project: ${project.title}`);
      return;
    }

    // Calculate profit distribution: 70% to Founder, 30% to project members
    const founderShare = (projectProfit * 70) / 100;
    const projectMembersShare = (projectProfit * 30) / 100;
    const profitPerMember = projectMembersShare / projectMembers.length;
    
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    console.log(`💸 Profit Distribution:`);
    console.log(`   Total Profit: ₹${projectProfit.toLocaleString()}`);
    console.log(`   Founder (70%): ₹${founderShare.toLocaleString()}`);
    console.log(`   Project Members (30%): ₹${projectMembersShare.toLocaleString()}`);
    console.log(`   Per Project Member: ₹${profitPerMember.toLocaleString()}`);

    // Create payout for Founder
    await this.addToPayout(founderUser._id.toString(), month, year, {
      sourceType: `Project: ${project.title}`,
      sourceId: project._id,
      amount: founderShare,
      percentage: 70,
      description: `Founder share from ${project.title} (70%)`
    });
    console.log(`   ✅ Founder: ₹${founderShare.toLocaleString()}`);

    // Create payouts for each project member
    for (const member of projectMembers) {
      await this.addToPayout(member._id.toString(), month, year, {
        sourceType: `Project: ${project.title}`,
        sourceId: project._id,
        amount: profitPerMember,
        percentage: (30 / projectMembers.length),
        description: `Project member share from ${project.title} (30% ÷ ${projectMembers.length} members)`
      });

      console.log(`   ✅ ${member.name}: ₹${profitPerMember.toLocaleString()}`);
    }

    // Mark all project income as profit shared
    for (const income of projectIncome) {
      await Income.findByIdAndUpdate(income._id, { profitShared: true });
    }

    // Update project financials
    await Project.findByIdAndUpdate(projectId, {
      totalIncome: project.totalIncome + totalIncome,
      totalExpense: project.totalExpense + totalExpenses
    });

    console.log(`✅ Project profit sharing completed for: ${project.title}`);

  } catch (error) {
    console.error('❌ Error computing project profit sharing:', error);
    throw error;
  }
};

// Add or update payout for a user
exports.addToPayout = async (userId, month, year, shareDetail) => {
  try {
    // Find existing payout or create new
    let payout = await Payout.findOne({ userId, month, year });

    if (payout) {
      // Add to existing payout
      payout.shares.push(shareDetail);
      await payout.save(); // This will trigger pre-save to recalculate totals
    } else {
      // Get user's base salary
      const user = await User.findById(userId);
      
      // Create new payout
      payout = await Payout.create({
        userId,
        month,
        year,
        baseSalary: user.salary || 0,
        shares: [shareDetail],
        status: 'pending'
      });
    }

    return payout;
  } catch (error) {
    console.error('Error adding to payout:', error);
    throw error;
  }
};

// Compute profit sharing for all projects
exports.computeAllProjectProfitSharing = async () => {
  try {
    console.log('🔄 Computing profit sharing for all projects...');

    // Get all active projects
    const projects = await Project.find({
      status: { $in: ['active', 'completed'] }
    }).populate('teamId', 'name members');

    console.log(`📊 Found ${projects.length} projects to process`);

    for (const project of projects) {
      await this.computeProjectProfitSharing(project._id);
    }

    console.log('✅ All project profit sharing completed');

  } catch (error) {
    console.error('❌ Error computing all project profit sharing:', error);
    throw error;
  }
};

// Get project profit summary
exports.getProjectProfitSummary = async (projectId) => {
  try {
    const project = await Project.findById(projectId)
      .populate('teamId', 'name members')
      .populate('ownerId', 'name');

    if (!project) {
      throw new Error('Project not found');
    }

    // Calculate project financials
    const projectIncome = await Income.find({
      teamId: project.teamId._id
    });

    const projectExpenses = await Expense.find({
      projectId: projectId
    });

    const totalIncome = projectIncome.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = projectExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const projectProfit = totalIncome - totalExpenses;

    return {
      project: {
        id: project._id,
        title: project.title,
        team: project.teamId.name,
        owner: project.ownerId.name
      },
      financials: {
        totalIncome,
        totalExpenses,
        projectProfit
      },
      incomeCount: projectIncome.length,
      expenseCount: projectExpenses.length
    };

  } catch (error) {
    console.error('Error getting project profit summary:', error);
    throw error;
  }
};
