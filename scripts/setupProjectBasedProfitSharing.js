const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import models
const Project = require('../models/Project');
const Team = require('../models/Team');
const User = require('../models/User');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Payout = require('../models/Payout');
const { computeProjectProfitSharing, getProjectProfitSummary } = require('../utils/projectProfitSharing');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const setupProjectBasedProfitSharing = async () => {
  try {
    console.log('🚀 Setting up Project-Based Profit Sharing System\n');

    // Clear existing payouts to start fresh
    await Payout.deleteMany({});
    console.log('🗑️ Cleared existing payouts\n');

    // Get teams
    const teams = await Team.find({}).populate('members', 'name email');
    console.log('📋 Available Teams:');
    teams.forEach(team => {
      console.log(`   ${team.name} (${team.members.length} members)`);
    });
    console.log('');

    // Create projects for each team
    const projects = [];

    for (const team of teams) {
      let projectTitle = '';
      let projectCategory = '';

      switch (team.name) {
        case 'Coaching Center Team':
          projectTitle = 'CS 13 Morning';
          projectCategory = 'Coaching';
          break;
        case 'Innovation Team':
          projectTitle = 'IoT Innovation Project';
          projectCategory = 'Innovation';
          break;
        case 'Paid Workshop Team':
          projectTitle = 'Advanced Workshop Series';
          projectCategory = 'Workshops';
          break;
        case 'Media and Content Team':
          projectTitle = 'Content Creation Hub';
          projectCategory = 'Media';
          break;
        case 'Mission Workshop':
          projectTitle = 'Mission Workshop Program';
          projectCategory = 'Workshops';
          break;
        default:
          projectTitle = `${team.name} Project`;
          projectCategory = 'Other';
      }

      // Create project
      const project = await Project.create({
        title: projectTitle,
        description: `Main project for ${team.name}`,
        category: projectCategory,
        status: 'active',
        teamId: team._id,
        ownerId: team.leadUserId,
        budget: 100000,
        allocatedBudget: 100000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
      });

      projects.push(project);
      console.log(`✅ Created project: ${project.title} for team: ${team.name}`);
    }

    console.log(`\n📊 Created ${projects.length} projects\n`);

    // Link existing income to projects based on team
    console.log('🔗 Linking income to projects...');
    const incomeRecords = await Income.find({});
    
    for (const income of incomeRecords) {
      const team = teams.find(t => t._id.toString() === income.teamId.toString());
      if (team) {
        const project = projects.find(p => p.teamId.toString() === team._id.toString());
        if (project) {
          income.sourceRefId = project._id;
          income.sourceRefModel = 'Project';
          await income.save();
          console.log(`   ✅ Linked ${income.sourceType} (₹${income.amount}) to ${project.title}`);
        }
      }
    }

    // Link existing expenses to projects based on team
    console.log('\n🔗 Linking expenses to projects...');
    const expenseRecords = await Expense.find({});
    
    for (const expense of expenseRecords) {
      const team = teams.find(t => t._id.toString() === expense.teamId.toString());
      if (team) {
        const project = projects.find(p => p.teamId.toString() === team._id.toString());
        if (project) {
          expense.projectId = project._id;
          await expense.save();
          console.log(`   ✅ Linked ${expense.category} (₹${expense.amount}) to ${project.title}`);
        }
      }
    }

    console.log('\n💰 Computing project-based profit sharing...\n');

    // Compute profit sharing for each project
    for (const project of projects) {
      console.log(`\n📊 Processing Project: ${project.title}`);
      console.log('─'.repeat(50));
      
      const summary = await getProjectProfitSummary(project._id);
      console.log(`   Team: ${summary.project.team}`);
      console.log(`   Income: ₹${summary.financials.totalIncome.toLocaleString()} (${summary.incomeCount} records)`);
      console.log(`   Expenses: ₹${summary.financials.totalExpenses.toLocaleString()} (${summary.expenseCount} records)`);
      console.log(`   Profit: ₹${summary.financials.projectProfit.toLocaleString()}`);
      
      if (summary.financials.projectProfit > 0) {
        await computeProjectProfitSharing(project._id);
      } else {
        console.log(`   ⚠️ No profit to distribute`);
      }
    }

    // Show final payout summary
    console.log('\n📋 Final Payout Summary:');
    console.log('═'.repeat(60));

    const payouts = await Payout.find({})
      .populate('userId', 'name email')
      .sort({ netAmount: -1 });

    payouts.forEach(payout => {
      console.log(`👤 ${payout.userId?.name || 'Unknown'}`);
      console.log(`   Email: ${payout.userId?.email || 'N/A'}`);
      console.log(`   Base Salary: ₹${(payout.baseSalary || 0).toLocaleString()}`);
      console.log(`   Project Shares: ₹${(payout.totalShares || 0).toLocaleString()}`);
      console.log(`   Net Amount: ₹${(payout.netAmount || 0).toLocaleString()}`);
      console.log(`   Sources: ${payout.shares?.length || 0} project shares`);
      
      if (payout.shares && payout.shares.length > 0) {
        payout.shares.forEach((share, index) => {
          console.log(`     ${index + 1}. ${share.sourceType}: ₹${share.amount.toLocaleString()}`);
        });
      }
      console.log('');
    });

    // Calculate totals
    const totalBaseSalary = payouts.reduce((sum, p) => sum + (p.baseSalary || 0), 0);
    const totalProjectShares = payouts.reduce((sum, p) => sum + (p.totalShares || 0), 0);
    const totalNetAmount = payouts.reduce((sum, p) => sum + (p.netAmount || 0), 0);

    console.log('📊 Summary Totals:');
    console.log(`   Total Base Salary: ₹${totalBaseSalary.toLocaleString()}`);
    console.log(`   Total Project Shares: ₹${totalProjectShares.toLocaleString()}`);
    console.log(`   Total Net Amount: ₹${totalNetAmount.toLocaleString()}`);
    console.log(`   Total Payouts: ${payouts.length}`);

    console.log('\n✅ Project-based profit sharing setup completed!');

  } catch (error) {
    console.error('❌ Error setting up project-based profit sharing:', error);
  } finally {
    mongoose.connection.close();
  }
};

setupProjectBasedProfitSharing();
