const Project = require('../models/Project');
const User = require('../models/User');
const Role = require('../models/Role');
const Payroll = require('../models/Payroll');
const Income = require('../models/Income');
const Expense = require('../models/Expense');

// Compute project-based profit sharing with configurable per-member percentages
// and working-days weighting.
// Rules:
//  - Founder receives 70% of project profit.
//  - Team pool is 30% of project profit.
//  - If the project owner is among team members, they receive an extra 3% of the 30% pool.
//  - The remaining 27% (or full 30% if no owner) is distributed among non-founder
//    members based on (configured share percentage) × (working days within period).
exports.computeProjectProfitSharing = async (projectId, month = null, year = null) => {
  try {
    console.log(`🔄 Computing profit sharing for project: ${projectId}`);
    if (month && year) {
      console.log(`📅 Filtering for month: ${month}, year: ${year}`);
    }

    // Find project with related data
    const project = await Project.findById(projectId)
      .populate('teamId')
      .populate('projectMembers');

    if (!project) {
      throw new Error('Project not found');
    }

    // Build date filter if month and year are provided
    let dateFilter = {};
    if (month && year) {
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const startDate = new Date(yearNum, monthNum - 1, 1); // First day of month
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999); // Last day of month
      
      dateFilter = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Get income and expense records for this project - with optional date filter
    const incomeQuery = { 
      sourceRefId: projectId,
      sourceRefModel: 'Project'
    };
    if (Object.keys(dateFilter).length > 0) {
      incomeQuery.date = dateFilter;
    }
    
    const expenseQuery = { 
      projectId: projectId 
    };
    if (Object.keys(dateFilter).length > 0) {
      expenseQuery.date = dateFilter;
    }

    const incomeRecords = await Income.find(incomeQuery);
    const expenseRecords = await Expense.find(expenseQuery);

    // Calculate project profit
    const totalIncome = incomeRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalExpense = expenseRecords.reduce((sum, record) => sum + record.amount, 0);
    const profit = totalIncome - totalExpense;

    console.log(`📊 Project ${project.title}: Income: ₹${totalIncome}, Expense: ₹${totalExpense}, Profit: ₹${profit}`);
    console.log(`📝 Income records count: ${incomeRecords.length}, Expense records count: ${expenseRecords.length}`);

    if (profit <= 0) {
      console.log('⚠️ No profit to distribute');
      return { profit, founderShare: 0, eligibleCount: 0 };
    }

    // Get role IDs
    const founderRole = await Role.findOne({ key: 'FOUNDER' });
    const managerRole = await Role.findOne({ key: 'TEAM_MANAGER' });
    const memberRole = await Role.findOne({ key: 'TEAM_MEMBER' });

    // Calculate pools
    const founderShare = profit * 0.7;
    const teamPool = profit * 0.3;

    // Add founder payout entry
    const founder = await User.findOne({ 
      roleIds: { $in: [founderRole._id] },
      active: true 
    });

    const eligibleUsers = [];
    if (founder) {
      eligibleUsers.push({
        user: founder,
        shareAmount: Math.max(0, founderShare),
        description: `70% CS Profit from ${project.title}`,
        isFounder: true
      });
    }

    // Get the project owner
    const projectOwner = await User.findById(project.ownerId);

    // Determine computation period
    const currentDate = new Date();
    const monthToUse = month || (currentDate.getMonth() + 1);
    const yearToUse = year || currentDate.getFullYear();
    const periodStart = new Date(yearToUse, monthToUse - 1, 1);
    const periodEnd = new Date(yearToUse, monthToUse, 0, 23, 59, 59, 999);
    // For the current month, cap the effective end at "today" to reflect actual working days so far
    const effectivePeriodEnd = currentDate < periodEnd ? currentDate : periodEnd;

    // Build eligible non-founder set from memberDetails with overlap in period
    // Include both managers and members who overlap the period
    const memberUserIds = project.memberDetails
      .filter((detail) => {
        const joined = new Date(detail.joinedDate);
        const left = detail.leftDate ? new Date(detail.leftDate) : null;
        const overlaps = joined <= effectivePeriodEnd && (!left || left >= periodStart);
        return overlaps;
      })
      .map((detail) => detail.userId);

    // Fetch users and role info
    const nonFounderUsers = await User.find({
      _id: { $in: memberUserIds },
      active: true
    });

    // Map details by userId for share % and dates
    const detailByUserId = new Map();
    project.memberDetails.forEach((d) => detailByUserId.set(d.userId.toString(), d));

    // Prepare weighting inputs
    let hasProjectOwner = false;
    const weightedMembers = [];
    for (const user of nonFounderUsers) {
      // Skip founder if accidentally included
      const isFounderUser = (user.roleIds || []).some((r) => r.toString && r.toString() === founderRole?._id?.toString());
      if (isFounderUser) continue;

      const isOwner = projectOwner && user._id.toString() === projectOwner._id.toString();
      if (isOwner) hasProjectOwner = true;

      const detail = detailByUserId.get(user._id.toString());
      const joined = new Date(detail?.joinedDate || project.startDate);
      const left = detail?.leftDate ? new Date(detail.leftDate) : null;
      const start = joined > periodStart ? joined : periodStart;
      const end = left && left < effectivePeriodEnd ? left : effectivePeriodEnd;
      const ms = Math.max(0, end - start);
      const workingDays = ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;

      if (workingDays <= 0) {
        continue; // no contribution in this period
      }

      const configuredPct = typeof detail?.sharePercentage === 'number' ? detail.sharePercentage : null;
      const baseWeight = configuredPct !== null ? Math.max(0, configuredPct) : 1; // default equal weight
      const weight = baseWeight * workingDays;

      weightedMembers.push({
        user,
        isProjectOwner: isOwner,
        workingDays,
        configuredPct: configuredPct,
        weight
      });
    }

    // Compute owner bonus (3% of the 30% pool) if owner present
    const ownerBonus = hasProjectOwner ? teamPool * 0.03 : 0;
    const distributableTeamPool = Math.max(0, teamPool - ownerBonus);

    // Sum weights and distribute
    const totalWeight = weightedMembers.reduce((s, m) => s + m.weight, 0);
    weightedMembers.forEach((m) => {
      const share = totalWeight > 0 ? (distributableTeamPool * (m.weight / totalWeight)) : 0;
      const finalShare = m.isProjectOwner ? share + ownerBonus : share;
      eligibleUsers.push({
        user: m.user,
        shareAmount: Math.max(0, finalShare),
        description: `Team Share from ${project.title}`,
        isFounder: false,
        isManager: (m.user.roleIds || []).some((r) => r.toString && r.toString() === managerRole?._id?.toString()),
        isProjectOwner: m.isProjectOwner,
        ownerBonus: m.isProjectOwner ? ownerBonus : 0,
        meta: {
          workingDays: m.workingDays,
          configuredPct: m.configuredPct,
          effectiveWeight: m.weight,
        }
      });
    });

    console.log(`👥 Eligible users: ${eligibleUsers.length} (Founder included: ${!!founder})`);

    // Use provided month/year or default to current month/year
    const monthString = `${yearToUse}-${monthToUse.toString().padStart(2, '0')}`;

    console.log(`📅 Computing for period: ${monthString}`);

    const payrollRecords = [];
    
    // Get all current payroll records for this project and month
    const existingPayrolls = await Payroll.find({
      projectId: projectId,
      month: monthString
    });

    // Get list of current eligible user IDs
    const eligibleUserIds = eligibleUsers.map(u => u.user._id.toString());

    // Cancel/delete payroll records for users no longer in the project
    for (const existingPayroll of existingPayrolls) {
      const userIdStr = existingPayroll.userId.toString();
      if (!eligibleUserIds.includes(userIdStr)) {
        // This user is no longer part of the project, cancel their payroll
        if (existingPayroll.status === 'paid') {
          console.log(`⚠️ Keeping paid payroll for removed user ${existingPayroll.userId} (already paid)`);
        } else {
          await Payroll.findByIdAndDelete(existingPayroll._id);
          console.log(`🗑️ Deleted payroll record for removed user`);
        }
      }
    }

    for (const eligibleUser of eligibleUsers) {
      // Get member details if any (for working days & configured % meta)
      const memberDetail = project.memberDetails.find(
        detail => detail.userId.toString() === eligibleUser.user._id.toString()
      );

      // For founder, use project start date; for others, use joinedDate
      const memberJoinedDate = eligibleUser.isFounder 
        ? project.startDate 
        : (memberDetail ? memberDetail.joinedDate : project.startDate);
      const projectStartDate = project.startDate;

      // Working days for storage (prefer computed meta if present)
      const workDurationDays = eligibleUser.meta?.workingDays ?? (() => {
        const start = memberJoinedDate > periodStart ? memberJoinedDate : periodStart;
        const end = effectivePeriodEnd;
        const ms = Math.max(0, end - start);
        return ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
      })();

      // Member-specific period financials (for display only)
      let memberIncome = 0, memberExpense = 0;
      if (eligibleUser.isFounder) {
        memberIncome = totalIncome;
        memberExpense = totalExpense;
      } else {
        const memberStartDate = new Date(Math.max((new Date(memberJoinedDate)).getTime(), periodStart.getTime()));
        const memberIncomeQuery = {
          sourceRefId: projectId,
          sourceRefModel: 'Project',
          date: {
            $gte: memberStartDate,
            $lte: effectivePeriodEnd
          }
        };
        const memberExpenseQuery = {
          projectId: projectId,
          date: {
            $gte: memberStartDate,
            $lte: effectivePeriodEnd
          }
        };
        const memberIncomes = await Income.find(memberIncomeQuery);
        const memberExpenses = await Expense.find(memberExpenseQuery);
        memberIncome = memberIncomes.reduce((sum, inc) => sum + inc.amount, 0);
        memberExpense = memberExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      }

      // Check if payroll record already exists for this user/month/project
      let existingPayroll = await Payroll.findOne({
        userId: eligibleUser.user._id,
        projectId: projectId,
        month: monthString
      });

      if (existingPayroll) {
        // Store old amount for logging
        const oldAmount = existingPayroll.profitShare;
        // Update with new profit amounts
        existingPayroll.profitShare = eligibleUser.shareAmount;
        existingPayroll.description = eligibleUser.description;
        // Update member-specific financial data (for display)
        existingPayroll.projectIncome = memberIncome;
        existingPayroll.projectExpenses = memberExpense;
        existingPayroll.projectBudget = project.allocatedBudget || 0;
        existingPayroll.netProfit = profit;
        // Update member work tracking
        existingPayroll.memberJoinedDate = memberJoinedDate;
        // Persist member left date for reporting if available
        if (memberDetail && memberDetail.leftDate) {
          existingPayroll.memberLeftDate = memberDetail.leftDate;
        } else {
          existingPayroll.memberLeftDate = undefined;
        }
        existingPayroll.memberIsActive = !!(memberDetail ? memberDetail.isActive : true);
        existingPayroll.workDurationDays = workDurationDays;
        existingPayroll.projectStartDate = projectStartDate;
        // Update project owner info
        existingPayroll.isProjectOwner = eligibleUser.isProjectOwner || false;
        existingPayroll.ownerBonus = eligibleUser.ownerBonus || 0;
        // Store configured share percent for visibility
        if (memberDetail && typeof memberDetail.sharePercentage === 'number') {
          existingPayroll.configuredSharePercent = memberDetail.sharePercentage;
        }
        // Keep the same status if already paid, otherwise set to pending
        if (existingPayroll.status === 'paid') {
          // Keep it as paid if it was already marked as paid
        } else {
          existingPayroll.status = 'pending';
        }
        await existingPayroll.save();
        console.log(`📝 Updated payroll for ${eligibleUser.user.name}: ₹${oldAmount} → ₹${eligibleUser.shareAmount} (${workDurationDays} days, Income: ₹${memberIncome}, Expenses: ₹${memberExpense})`);
      } else {
        // Create new payroll record
        const userSalary = eligibleUser.user.salary || 0;
        
        const newPayroll = new Payroll({
          userId: eligibleUser.user._id,
          teamId: project.teamId._id,
          projectId: projectId,
          month: monthString,
          year: yearToUse,
          baseSalary: userSalary,
          profitShare: eligibleUser.shareAmount,
          bonuses: 0,
          deductions: 0,
          status: 'pending',
          description: eligibleUser.description,
          createdBy: founder ? founder._id : eligibleUser.user._id,
          // Store member-specific financial data (for display)
          projectIncome: memberIncome,
          projectExpenses: memberExpense,
          projectBudget: project.allocatedBudget || 0,
          netProfit: profit,
          // Store member work tracking
          memberJoinedDate: memberJoinedDate,
          memberLeftDate: memberDetail && memberDetail.leftDate ? memberDetail.leftDate : undefined,
          memberIsActive: !!(memberDetail ? memberDetail.isActive : true),
          workDurationDays: workDurationDays,
          projectStartDate: projectStartDate,
          // Store project owner info
          isProjectOwner: eligibleUser.isProjectOwner || false,
          ownerBonus: eligibleUser.ownerBonus || 0
        });

        if (memberDetail && typeof memberDetail.sharePercentage === 'number') {
          newPayroll.configuredSharePercent = memberDetail.sharePercentage;
        }

        await newPayroll.save();
        payrollRecords.push(newPayroll);
        console.log(`✅ Created payroll for ${eligibleUser.user.name}: ₹${eligibleUser.shareAmount} (${workDurationDays} days, Income: ₹${memberIncome}, Expenses: ₹${memberExpense})`);
      }
    }

    // Mark income records as profit shared
    await Income.updateMany(
      { _id: { $in: incomeRecords.map(r => r._id) } },
      { profitShared: true }
    );

    console.log(`🎉 Profit sharing completed for project: ${project.title}`);
    console.log(`💰 Founder share: ₹${founderShare}`);

    return {
      project: project.title,
      profit,
      founderShare,
      eligibleCount: eligibleUsers.length,
      payrollRecords: payrollRecords.length
    };

  } catch (error) {
    console.error('❌ Error computing project profit sharing:', error);
    throw error;
  }
};

// Get project profit summary
exports.getProjectProfitSummary = async (projectId, month = null, year = null) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Build date filter if month and year are provided
    let dateFilter = {};
    if (month && year) {
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      
      dateFilter = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const incomeQuery = { 
      sourceRefId: projectId,
      sourceRefModel: 'Project'
    };
    if (Object.keys(dateFilter).length > 0) {
      incomeQuery.date = dateFilter;
    }

    const expenseQuery = { 
      projectId: projectId 
    };
    if (Object.keys(dateFilter).length > 0) {
      expenseQuery.date = dateFilter;
    }

    const incomeRecords = await Income.find(incomeQuery);
    const expenseRecords = await Expense.find(expenseQuery);

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
exports.computeAllProjectsProfitSharing = async (month = null, year = null) => {
  try {
    console.log('🚀 Computing profit sharing for all active projects...');
    if (month && year) {
      console.log(`📅 For period: ${month}/${year}`);
    }

    const activeProjects = await Project.find({ 
      status: { $in: ['active', 'completed'] } 
    });

    const results = [];

    for (const project of activeProjects) {
      try {
        const result = await exports.computeProjectProfitSharing(project._id, month, year);
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