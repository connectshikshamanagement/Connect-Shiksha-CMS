/**
 * Backfill script to assign teamCodes to existing users
 * Assigns codes based on creation date (oldest first)
 * Format: CSTeam01, CSTeam02, etc.
 * 
 * Run: node scripts/backfillTeamCodes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function backfillTeamCodes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/crm';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all users without teamCode, ordered by creation date
    const usersWithoutCode = await User.find({
      $or: [
        { teamCode: { $exists: false } },
        { teamCode: null }
      ]
    }).sort({ createdAt: 1 }); // Oldest first

    console.log(`\n📋 Found ${usersWithoutCode.length} users without teamCode`);

    if (usersWithoutCode.length === 0) {
      console.log('✅ All users already have teamCodes assigned');
      await mongoose.disconnect();
      return;
    }

    // Get all existing teamCodes to find next available
    const existingUsers = await User.find({ 
      teamCode: { $exists: true, $ne: null } 
    }).select('teamCode');
    
    const usedNumbers = new Set();
    for (const user of existingUsers) {
      const m = /CSTeam(\d+)/.exec(user.teamCode || '');
      if (m) {
        const n = parseInt(m[1], 10) || 0;
        usedNumbers.add(n);
      }
    }

    // Assign teamCodes starting from next available number
    let nextNum = 1;
    while (usedNumbers.has(nextNum)) {
      nextNum++;
    }

    console.log(`\n🔄 Starting assignment from CSTeam${String(nextNum).padStart(2, '0')}\n`);

    let assigned = 0;
    for (const user of usersWithoutCode) {
      // Find next available number
      while (usedNumbers.has(nextNum)) {
        nextNum++;
      }
      
      const teamCode = `CSTeam${String(nextNum).padStart(2, '0')}`;
      user.teamCode = teamCode;
      await user.save();
      
      usedNumbers.add(nextNum);
      assigned++;
      
      console.log(`✅ Assigned ${teamCode} to ${user.name} (${user.email}) - Created: ${user.createdAt}`);
      nextNum++;
    }

    console.log(`\n✨ Successfully assigned ${assigned} teamCodes!`);
    console.log('\n📊 Summary:');
    const allUsers = await User.find().select('name email teamCode createdAt').sort({ teamCode: 1 });
    for (const user of allUsers) {
      if (user.teamCode) {
        console.log(`   ${user.teamCode} - ${user.name} (${user.email})`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
backfillTeamCodes();

