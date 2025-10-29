const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const setMemberJoinDate = async () => {
  try {
    // CONFIGURE THESE VALUES:
    const memberEmail = 'rajadamahe@gmail.com'; // Member to update
    const projectTitle = '40 days workshop'; // Project name (partial match OK)
    const joinDate = new Date('2025-10-27'); // Actual join date (YYYY-MM-DD)

    console.log('🔄 Setting member join date...\n');
    console.log(`Member: ${memberEmail}`);
    console.log(`Project: ${projectTitle}`);
    console.log(`Join Date: ${joinDate.toLocaleDateString()}\n`);

    // Find the user
    const user = await User.findOne({ email: memberEmail });
    if (!user) {
      console.log(`❌ User not found: ${memberEmail}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);

    // Find the project
    const project = await Project.findOne({ 
      title: { $regex: projectTitle, $options: 'i' } 
    });
    
    if (!project) {
      console.log(`❌ Project not found matching: ${projectTitle}`);
      process.exit(1);
    }

    console.log(`✅ Found project: ${project.title}`);

    // Check if user is in project members
    const isMember = project.projectMembers.some(
      memberId => memberId.toString() === user._id.toString()
    );

    if (!isMember) {
      console.log(`❌ ${user.name} is not a member of ${project.title}`);
      console.log(`   Add them to the project first!`);
      process.exit(1);
    }

    // Find or create member detail
    let memberDetail = project.memberDetails.find(
      detail => detail.userId.toString() === user._id.toString()
    );

    if (memberDetail) {
      const oldDate = new Date(memberDetail.joinedDate);
      console.log(`📝 Current join date: ${oldDate.toLocaleDateString()}`);
      console.log(`📝 New join date: ${joinDate.toLocaleDateString()}`);
      
      memberDetail.joinedDate = joinDate;
      memberDetail.isActive = true;
    } else {
      console.log(`📝 Creating new member detail with join date: ${joinDate.toLocaleDateString()}`);
      project.memberDetails.push({
        userId: user._id,
        joinedDate: joinDate,
        isActive: true
      });
    }

    await project.save();

    console.log(`\n✅ Successfully updated join date for ${user.name} in ${project.title}!`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Go to Payroll page`);
    console.log(`   2. Select the month/year`);
    console.log(`   3. Select the project`);
    console.log(`   4. Click "Compute Profit Sharing"`);
    console.log(`\n   ${user.name} will now get profit only from ${joinDate.toLocaleDateString()} onwards!`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting member join date:', error);
    process.exit(1);
  }
};

setMemberJoinDate();

