const mongoose = require('mongoose');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Project = require('../models/Project');
const User = require('../models/User');
const Team = require('../models/Team');
const Payout = require('../models/Payout');
const Role = require('../models/Role');

async function traceNikhilCalculation() {
  try {
    console.log('🔍 Tracing Nikhil Telase Payout Calculation');
    console.log('════════════════════════════════════════════════════════════');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-shiksha-crm');
    console.log('✅ MongoDB Connected');

    // First, let's see all income records to understand the profit sharing sources
    console.log('\n📊 Analyzing All Income Records:');
    const allIncome = await Income.find({}).populate('receivedByUserId', 'name email').populate('teamId', 'name');
    
    console.log(`Found ${allIncome.length} income records:`);
    allIncome.forEach((income, index) => {
      console.log(`\n${index + 1}. Income ID: ${income._id}`);
      console.log(`   Source Type: ${income.sourceType}`);
      console.log(`   Amount: ₹${income.amount.toLocaleString()}`);
      console.log(`   Received By: ${income.receivedByUserId?.name || 'N/A'} (${income.receivedByUserId?.email || 'N/A'})`);
      console.log(`   Team: ${income.teamId?.name || 'N/A'}`);
      console.log(`   Project Ref: ${income.sourceRefModel} - ${income.sourceRefId || 'N/A'}`);
      console.log(`   Date: ${income.date.toISOString().split('T')[0]}`);
      console.log(`   Profit Shared: ${income.profitShared}`);
    });

    // Let's see all projects and their financial data
    console.log('\n📁 Analyzing All Projects:');
    const allProjects = await Project.find({})
      .populate('teamId', 'name')
      .populate('projectMembers', 'name email')
      .populate('ownerId', 'name email');

    console.log(`Found ${allProjects.length} projects:`);
    allProjects.forEach((project, index) => {
      console.log(`\n${index + 1}. Project: ${project.title}`);
      console.log(`   Team: ${project.teamId?.name || 'N/A'}`);
      console.log(`   Budget: ₹${project.budget?.toLocaleString() || 0}`);
      console.log(`   Deal Amount: ₹${project.totalDealAmount?.toLocaleString() || 0}`);
      console.log(`   Total Income: ₹${project.totalIncome?.toLocaleString() || 0}`);
      console.log(`   Total Expenses: ₹${project.totalExpense?.toLocaleString() || 0}`);
      console.log(`   Project Members: ${project.projectMembers?.length || 0}`);
      if (project.projectMembers && project.projectMembers.length > 0) {
        project.projectMembers.forEach((member, i) => {
          console.log(`     ${i + 1}. ${member.name || member} (${member.email || 'N/A'})`);
        });
      }
    });

    // Let's see all teams and their members
    console.log('\n👥 Analyzing All Teams:');
    const allTeams = await Team.find({}).populate('members', 'name email').populate('leadUserId', 'name email');
    
    allTeams.forEach((team, index) => {
      console.log(`\n${index + 1}. Team: ${team.name}`);
      console.log(`   Category: ${team.category}`);
      console.log(`   Lead: ${team.leadUserId?.name || 'N/A'}`);
      console.log(`   Members: ${team.members?.length || 0}`);
      if (team.members && team.members.length > 0) {
        team.members.forEach((member, i) => {
          console.log(`     ${i + 1}. ${member.name || member} (${member.email || 'N/A'})`);
        });
      }
    });

    // Let's see all roles
    console.log('\n🎭 Analyzing All Roles:');
    const allRoles = await Role.find({});
    allRoles.forEach((role, index) => {
      console.log(`\n${index + 1}. Role: ${role.name} (${role.key})`);
      console.log(`   Description: ${role.description}`);
      console.log(`   Permissions: ${role.permissions?.length || 0}`);
    });

    // Let's see all payouts to understand the current profit sharing
    console.log('\n💰 Analyzing All Payouts:');
    const allPayouts = await Payout.find({}).populate('userId', 'name email');
    
    allPayouts.forEach((payout, index) => {
      console.log(`\n${index + 1}. Payout for: ${payout.userId?.name || 'Unknown'} (${payout.userId?.email || 'Unknown'})`);
      console.log(`   Month: ${payout.month}`);
      console.log(`   Base Salary: ₹${payout.baseSalary?.toLocaleString() || 0}`);
      console.log(`   Total Shares: ₹${payout.totalShares?.toLocaleString() || 0}`);
      console.log(`   Net Amount: ₹${payout.netAmount?.toLocaleString() || 0}`);
      console.log(`   Status: ${payout.status}`);
      
      if (payout.profitShares && payout.profitShares.length > 0) {
        console.log(`   Profit Shares (${payout.profitShares.length} sources):`);
        payout.profitShares.forEach((share, i) => {
          console.log(`     ${i + 1}. ${share.source} - ₹${share.amount.toLocaleString()}`);
          console.log(`        Percentage: ${share.percentage}%`);
          console.log(`        Project: ${share.projectName || 'N/A'}`);
        });
      }
    });

    // Now let's simulate the profit sharing calculation
    console.log('\n🧮 Simulating Profit Sharing Calculation:');
    
    // Calculate total income
    const totalIncome = allIncome.reduce((sum, income) => sum + income.amount, 0);
    console.log(`\nTotal Income: ₹${totalIncome.toLocaleString()}`);

    // Calculate total expenses
    const allExpenses = await Expense.find({});
    const totalExpenses = allExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    console.log(`Total Expenses: ₹${totalExpenses.toLocaleString()}`);

    const totalProfit = totalIncome - totalExpenses;
    console.log(`Total Profit: ₹${totalProfit.toLocaleString()}`);

    // Let's see if there are any profit sharing rules
    console.log('\n📋 Checking for Profit Sharing Rules:');
    // Note: We don't have a ProfitSharingRule model in the current setup, 
    // so profit sharing is calculated based on the project-based system

    console.log('\n✅ Analysis completed!');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected');
  }
}

traceNikhilCalculation();
