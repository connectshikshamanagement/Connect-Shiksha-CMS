const mongoose = require('mongoose');
const User = require('../models/User');
const Payout = require('../models/Payout');

async function listAllUsers() {
  try {
    console.log('👥 Listing All Users and Payouts');
    console.log('════════════════════════════════════════════════════════════');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-shiksha-crm');
    console.log('✅ MongoDB Connected');

    // Get all users
    const users = await User.find({});
    console.log(`\n👤 Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name} (${user.email})`);
      console.log(`   User ID: ${user._id}`);
      console.log(`   Active: ${user.active}`);
      console.log(`   Roles: ${user.roleIds?.length || 0}`);
    });

    // Get all payouts with details
    const payouts = await Payout.find({}).populate('userId', 'name email');
    console.log(`\n💰 Found ${payouts.length} payout records:`);
    
    payouts.forEach((payout, index) => {
      console.log(`\n${index + 1}. Payout for: ${payout.userId?.name || 'Unknown'} (${payout.userId?.email || 'Unknown'})`);
      console.log(`   Payout ID: ${payout._id}`);
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

    console.log('\n✅ User and payout listing completed!');
    
  } catch (error) {
    console.error('❌ Error during listing:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected');
  }
}

listAllUsers();
