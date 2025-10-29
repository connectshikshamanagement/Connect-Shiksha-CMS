const mongoose = require('mongoose');
require('dotenv').config();

const Project = require('../models/Project');
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const fixRohit = async () => {
  try {
    const project = await Project.findOne({ title: 'demo' });
    const rohit = await User.findOne({ email: 'rohitbisen@gmail.com' });
    
    console.log('\n🔧 FIXING ROHIT\'S JOIN DATE\n');
    
    // Check if Rohit is in memberDetails
    let rohitDetail = project.memberDetails.find(
      d => d.userId.toString() === rohit._id.toString()
    );
    
    const joinDate = new Date('2025-10-27T00:00:00.000Z');
    
    if (rohitDetail) {
      console.log('Rohit found in memberDetails, updating join date...');
      rohitDetail.joinedDate = joinDate;
    } else {
      console.log('Rohit not in memberDetails, adding...');
      project.memberDetails.push({
        userId: rohit._id,
        joinedDate: joinDate,
        isActive: true,
        leftDate: null
      });
    }
    
    await project.save();
    
    console.log(`✅ Rohit's join date set to: ${joinDate.toISOString().split('T')[0]}`);
    console.log('\n📝 Now please recompute profit sharing on the Payroll page!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixRohit();

