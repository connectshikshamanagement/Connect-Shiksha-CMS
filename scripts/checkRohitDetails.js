const mongoose = require('mongoose');
require('dotenv').config();

const Project = require('../models/Project');
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const checkRohit = async () => {
  try {
    const project = await Project.findOne({ title: 'demo' }).populate('projectMembers', 'name email');
    
    console.log('\n👥 PROJECT MEMBERS:\n');
    project.projectMembers.forEach(m => {
      console.log(`${m.name} (${m.email})`);
    });
    
    const rohit = await User.findOne({ email: 'rohitbisen@gmail.com' });
    console.log(`\n\n🆔 Rohit's User ID: ${rohit._id}`);
    
    console.log('\n📋 MEMBER DETAILS:\n');
    project.memberDetails.forEach((detail, idx) => {
      const member = project.projectMembers.find(m => m._id.toString() === detail.userId.toString());
      console.log(`Detail ${idx + 1}:`);
      console.log(`  User ID: ${detail.userId}`);
      console.log(`  Member Name: ${member ? member.name : 'NOT FOUND'}`);
      console.log(`  Joined Date: ${detail.joinedDate}`);
      console.log(`  Active: ${detail.isActive}\n`);
    });
    
    const rohitDetail = project.memberDetails.find(
      d => d.userId.toString() === rohit._id.toString()
    );
    
    if (rohitDetail) {
      console.log(`\n✅ Rohit found in memberDetails:`);
      console.log(`  Joined: ${rohitDetail.joinedDate}`);
      console.log(`  Active: ${rohitDetail.isActive}`);
      
      // Check if we need to update it
      const expectedDate = new Date('2025-10-27');
      if (rohitDetail.joinedDate.toISOString().split('T')[0] !== expectedDate.toISOString().split('T')[0]) {
        console.log(`\n⚠️  Join date mismatch!`);
        console.log(`  Expected: ${expectedDate.toISOString().split('T')[0]}`);
        console.log(`  Actual: ${rohitDetail.joinedDate.toISOString().split('T')[0]}`);
        console.log(`\n📝 Updating Rohit's join date to Oct 27...`);
        
        rohitDetail.joinedDate = expectedDate;
        await project.save();
        console.log(`✅ Updated!`);
      }
    } else {
      console.log(`\n❌ Rohit NOT found in memberDetails!`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkRohit();

