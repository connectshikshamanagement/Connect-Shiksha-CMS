const mongoose = require('mongoose');
const Payout = require('../models/Payout');
const User = require('../models/User');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Project = require('../models/Project');
const Team = require('../models/Team');

async function analyzeNikhilPayout() {
  try {
    console.log('🔍 Analyzing Nikhil Telase Payout Calculation');
    console.log('════════════════════════════════════════════════════════════');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-shiksha-crm');
    console.log('✅ MongoDB Connected');

    // Find Nikhil's user record
    const nikhil = await User.findOne({ email: 'nikhiltelase@gmail.com' });
    if (!nikhil) {
      console.log('❌ Nikhil Telase not found');
      return;
    }

    console.log(`\n👤 User: ${nikhil.name} (${nikhil.email})`);
    console.log(`   User ID: ${nikhil._id}`);
    console.log(`   Active: ${nikhil.active}`);
    console.log(`   Roles: ${nikhil.roleIds?.length || 0}`);

    // Find Nikhil's payout records
    const payouts = await Payout.find({ userId: nikhil._id });
    console.log(`\n💰 Found ${payouts.length} payout records for Nikhil:`);

    payouts.forEach((payout, index) => {
      console.log(`\n${index + 1}. Payout ID: ${payout._id}`);
      console.log(`   Month: ${payout.month}`);
      console.log(`   Base Salary: ₹${payout.baseSalary?.toLocaleString() || 0}`);
      console.log(`   Total Shares: ₹${payout.totalShares?.toLocaleString() || 0}`);
      console.log(`   Bonuses: ₹${payout.bonuses?.toLocaleString() || 0}`);
      console.log(`   Deductions: ₹${payout.deductions?.toLocaleString() || 0}`);
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

    // Find income records that might be related to Nikhil's payouts
    console.log(`\n📊 Analyzing related income records:`);
    
    // Get all income records
    const allIncome = await Income.find({}).populate('receivedByUserId', 'name email');
    console.log(`   Total income records: ${allIncome.length}`);

    // Find income records received by Nikhil
    const nikhilIncome = allIncome.filter(income => 
      income.receivedByUserId && income.receivedByUserId._id.toString() === nikhil._id.toString()
    );
    console.log(`   Income received by Nikhil: ${nikhilIncome.length}`);

    nikhilIncome.forEach((income, index) => {
      console.log(`\n   ${index + 1}. Income ID: ${income._id}`);
      console.log(`      Source Type: ${income.sourceType}`);
      console.log(`      Amount: ₹${income.amount.toLocaleString()}`);
      console.log(`      Date: ${income.date.toISOString().split('T')[0]}`);
      console.log(`      Team: ${income.teamId?.name || 'N/A'}`);
      console.log(`      Project: ${income.sourceRefModel === 'Project' ? income.sourceRefId : 'N/A'}`);
      console.log(`      Profit Shared: ${income.profitShared}`);
    });

    // Find projects that Nikhil might be associated with
    console.log(`\n📁 Analyzing project associations:`);
    
    const allProjects = await Project.find({}).populate('teamId', 'name').populate('projectMembers', 'name email');
    const nikhilProjects = allProjects.filter(project => 
      project.projectMembers && project.projectMembers.some(member => 
        member._id.toString() === nikhil._id.toString()
      )
    );

    console.log(`   Projects where Nikhil is a member: ${nikhilProjects.length}`);
    nikhilProjects.forEach((project, index) => {
      console.log(`\n   ${index + 1}. ${project.title}`);
      console.log(`      Team: ${project.teamId?.name || 'N/A'}`);
      console.log(`      Budget: ₹${project.budget?.toLocaleString() || 0}`);
      console.log(`      Deal Amount: ₹${project.totalDealAmount?.toLocaleString() || 0}`);
      console.log(`      Total Income: ₹${project.totalIncome?.toLocaleString() || 0}`);
      console.log(`      Total Expenses: ₹${project.totalExpense?.toLocaleString() || 0}`);
    });

    // Find teams that Nikhil belongs to
    console.log(`\n👥 Analyzing team associations:`);
    
    const allTeams = await Team.find({}).populate('members', 'name email');
    const nikhilTeams = allTeams.filter(team => 
      team.members && team.members.some(member => 
        member._id.toString() === nikhil._id.toString()
      )
    );

    console.log(`   Teams where Nikhil is a member: ${nikhilTeams.length}`);
    nikhilTeams.forEach((team, index) => {
      console.log(`\n   ${index + 1}. ${team.name}`);
      console.log(`      Category: ${team.category}`);
      console.log(`      Members: ${team.members?.length || 0}`);
    });

    console.log('\n✅ Nikhil payout analysis completed!');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected');
  }
}

analyzeNikhilPayout();


