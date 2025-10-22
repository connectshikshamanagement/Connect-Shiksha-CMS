const mongoose = require('mongoose');
const User = require('../models/User');
const Payout = require('../models/Payout');

async function findNikhil() {
  try {
    console.log('🔍 Finding Nikhil Telase');
    console.log('════════════════════════════════════════════════════════════');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-shiksha-crm');
    console.log('✅ MongoDB Connected');

    // Search for users with "nikhil" in name or email
    const users = await User.find({
      $or: [
        { name: { $regex: /nikhil/i } },
        { email: { $regex: /nikhil/i } }
      ]
    });

    console.log(`\n👤 Found ${users.length} users matching "nikhil":`);
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name} (${user.email})`);
      console.log(`   User ID: ${user._id}`);
      console.log(`   Active: ${user.active}`);
    });

    // Search for all payouts
    const allPayouts = await Payout.find({}).populate('userId', 'name email');
    console.log(`\n💰 Found ${allPayouts.length} total payout records:`);
    
    allPayouts.forEach((payout, index) => {
      console.log(`\n${index + 1}. ${payout.userId?.name || 'Unknown'} (${payout.userId?.email || 'Unknown'})`);
      console.log(`   Total Shares: ₹${payout.totalShares?.toLocaleString() || 0}`);
      console.log(`   Net Amount: ₹${payout.netAmount?.toLocaleString() || 0}`);
      console.log(`   Month: ${payout.month}`);
      console.log(`   Status: ${payout.status}`);
      
      if (payout.profitShares && payout.profitShares.length > 0) {
        console.log(`   Profit Shares (${payout.profitShares.length} sources):`);
        payout.profitShares.forEach((share, i) => {
          console.log(`     ${i + 1}. ${share.source} - ₹${share.amount.toLocaleString()}`);
        });
      }
    });

    console.log('\n✅ Search completed!');
    
  } catch (error) {
    console.error('❌ Error during search:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected');
  }
}

findNikhil();


