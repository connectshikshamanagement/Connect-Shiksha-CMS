const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import models
const Payout = require('../models/Payout');
const Income = require('../models/Income');
const User = require('../models/User');
const Team = require('../models/Team');
const ProfitSharingRule = require('../models/ProfitSharingRule');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const analyzePayouts = async () => {
  try {
    console.log('🔍 Analyzing Individual Payouts - Detailed Breakdown\n');

    // Get current month and year
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    console.log(`📅 Analysis for Month: ${month}, Year: ${year}\n`);

    // Get all payouts for current month
    const payouts = await Payout.find({ month, year })
      .populate('userId', 'name email salary')
      .populate('processedBy', 'name')
      .sort({ netAmount: -1 });

    console.log(`📊 Found ${payouts.length} payout records\n`);

    // Get all income records that generated these payouts
    const incomeRecords = await Income.find({ 
      profitShared: true,
      date: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1)
      }
    }).sort({ amount: -1 });

    console.log(`💰 Income Records that Generated Payouts:\n`);
    incomeRecords.forEach(income => {
      console.log(`   ${income.sourceType}: ₹${income.amount.toLocaleString()} (${new Date(income.date).toLocaleDateString()})`);
    });

    console.log(`\n📋 Individual Payout Analysis:\n`);

    // Analyze each payout
    for (const payout of payouts) {
      console.log(`👤 ${payout.userId?.name || 'Unknown User'}`);
      console.log(`   Email: ${payout.userId?.email || 'N/A'}`);
      console.log(`   Base Salary: ₹${(payout.baseSalary || 0).toLocaleString()}`);
      console.log(`   Total Profit Shares: ₹${(payout.totalShares || 0).toLocaleString()}`);
      console.log(`   Bonuses: ₹${(payout.bonuses || 0).toLocaleString()}`);
      console.log(`   Deductions: ₹${(payout.deductions || 0).toLocaleString()}`);
      console.log(`   Net Amount: ₹${(payout.netAmount || 0).toLocaleString()}`);
      console.log(`   Status: ${payout.status}`);
      console.log(`   Profit Share Sources (${payout.shares?.length || 0} sources):`);

      if (payout.shares && payout.shares.length > 0) {
        payout.shares.forEach((share, index) => {
          console.log(`     ${index + 1}. ${share.sourceType}: ₹${share.amount.toLocaleString()} (${share.percentage}%)`);
          console.log(`        Description: ${share.description}`);
        });
      } else {
        console.log(`     No profit shares`);
      }

      console.log(`   ─────────────────────────────────────────`);
      console.log('');
    }

    // Get profit sharing rules
    console.log(`📜 Profit Sharing Rules:\n`);
    const rules = await ProfitSharingRule.find({ active: true });
    rules.forEach(rule => {
      console.log(`   ${rule.appliesTo}:`);
      rule.distribution.forEach(dist => {
        console.log(`     - ${dist.percentage}% to ${dist.recipientType} (${dist.recipientId})`);
      });
      console.log('');
    });

    // Calculate totals
    const totalBaseSalary = payouts.reduce((sum, payout) => sum + (payout.baseSalary || 0), 0);
    const totalProfitShares = payouts.reduce((sum, payout) => sum + (payout.totalShares || 0), 0);
    const totalBonuses = payouts.reduce((sum, payout) => sum + (payout.bonuses || 0), 0);
    const totalDeductions = payouts.reduce((sum, payout) => sum + (payout.deductions || 0), 0);
    const totalNetAmount = payouts.reduce((sum, payout) => sum + (payout.netAmount || 0), 0);

    console.log(`📊 Summary Totals:\n`);
    console.log(`   Total Base Salary: ₹${totalBaseSalary.toLocaleString()}`);
    console.log(`   Total Profit Shares: ₹${totalProfitShares.toLocaleString()}`);
    console.log(`   Total Bonuses: ₹${totalBonuses.toLocaleString()}`);
    console.log(`   Total Deductions: ₹${totalDeductions.toLocaleString()}`);
    console.log(`   Total Net Amount: ₹${totalNetAmount.toLocaleString()}`);

    // Analyze income sources
    console.log(`\n💰 Income Source Analysis:\n`);
    const incomeBySource = {};
    incomeRecords.forEach(income => {
      if (!incomeBySource[income.sourceType]) {
        incomeBySource[income.sourceType] = 0;
      }
      incomeBySource[income.sourceType] += income.amount;
    });

    Object.entries(incomeBySource).forEach(([source, amount]) => {
      console.log(`   ${source}: ₹${amount.toLocaleString()}`);
    });

    // Show distribution breakdown
    console.log(`\n🔄 Distribution Breakdown:\n`);
    for (const [source, amount] of Object.entries(incomeBySource)) {
      const rule = rules.find(r => r.appliesTo === source);
      if (rule) {
        console.log(`   ${source} (₹${amount.toLocaleString()}):`);
        rule.distribution.forEach(dist => {
          const shareAmount = (amount * dist.percentage) / 100;
          console.log(`     - ${dist.percentage}% (₹${shareAmount.toLocaleString()}) to ${dist.recipientType} (${dist.recipientId})`);
        });
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error analyzing payouts:', error);
  } finally {
    mongoose.connection.close();
  }
};

analyzePayouts();
