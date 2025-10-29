const mongoose = require('mongoose');
require('dotenv').config();

const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Project = require('../models/Project');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const checkPayroll = async () => {
  try {
    const project = await Project.findOne({ title: 'demo' });
    
    console.log('\n📊 ALL PAYROLL RECORDS (October 2025):\n');
    
    const payrolls = await Payroll.find({
      projectId: project._id,
      month: '2025-10'
    }).populate('userId', 'name email').populate('projectId', 'title');
    
    console.log(`Total Records: ${payrolls.length}\n`);
    
    payrolls.forEach(p => {
      console.log(`👤 ${p.userId.name} (${p.userId.email}):`);
      console.log(`  Join Date in Payroll: ${p.memberJoinedDate}`);
      console.log(`  Project Start: ${p.projectStartDate}`);
      console.log(`  Working Days: ${p.workDurationDays}`);
      console.log(`  Profit Share: ₹${p.profitShare}`);
      console.log(`  Project Income: ₹${p.projectIncome}`);
      console.log(`  Project Expenses: ₹${p.projectExpenses}`);
      console.log(`  Owner Bonus: ₹${p.ownerBonus || 0}`);
      console.log(`  Is Project Owner: ${p.isProjectOwner || false}`);
      
      const totalProfit = (p.projectIncome || 0) - (p.projectExpenses || 0);
      const percentage = totalProfit > 0 ? ((p.profitShare / totalProfit) * 100).toFixed(2) : 0;
      console.log(`  Percentage: ${percentage}%`);
      console.log('');
    });
    
    // Check project member details
    console.log('\n📋 PROJECT MEMBER DETAILS:\n');
    const projectWithDetails = await Project.findById(project._id);
    projectWithDetails.memberDetails.forEach(detail => {
      console.log(`User ID: ${detail.userId}`);
      console.log(`  Joined Date: ${detail.joinedDate}`);
      console.log(`  Active: ${detail.isActive}\n`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkPayroll();

