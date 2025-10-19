const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import models
const Income = require('../models/Income');
const Payout = require('../models/Payout');
const { computeProjectProfitSharing, getProjectProfitSummary } = require('../utils/projectProfitSharing');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const resetAndRunProjectProfitSharing = async () => {
  try {
    console.log('🔄 Resetting and Running Project-Based Profit Sharing\n');

    // Reset all income records to not profit shared
    await Income.updateMany({}, { profitShared: false });
    console.log('✅ Reset all income records to not profit shared\n');

    // Clear existing payouts
    await Payout.deleteMany({});
    console.log('✅ Cleared existing payouts\n');

    // Get all projects
    const Project = require('../models/Project');
    const projects = await Project.find({}).populate('teamId', 'name members');

    console.log(`📊 Found ${projects.length} projects to process\n`);

    // Process each project
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

    console.log('\n✅ Project-based profit sharing completed!');

  } catch (error) {
    console.error('❌ Error running project-based profit sharing:', error);
  } finally {
    mongoose.connection.close();
  }
};

resetAndRunProjectProfitSharing();
