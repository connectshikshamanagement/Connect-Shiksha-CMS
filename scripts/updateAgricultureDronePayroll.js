const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Import all models to register schemas
require('../models/User');
require('../models/Project');
require('../models/Payroll');
require('../models/Team');
require('../models/Role');
require('../models/Income');
require('../models/Expense');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const updateAgricultureDronePayroll = async () => {
  try {
    console.log('🔍 Updating Agriculture Drone project payroll...');
    
    const Project = mongoose.model('Project');
    const Payroll = mongoose.model('Payroll');
    const User = mongoose.model('User');
    const Role = mongoose.model('Role');
    
    // Find the Agriculture Drone project
    const project = await Project.findOne({ title: 'Agriculture Drone' });
    if (!project) {
      console.log('❌ Agriculture Drone project not found');
      return;
    }
    
    console.log(`\n📋 Project: ${project.title}`);
    console.log(`   Total Income: ₹${project.totalIncome}`);
    console.log(`   Total Expenses: ₹${project.totalExpense}`);
    console.log(`   Net Profit: ₹${project.totalIncome - project.totalExpense}`);
    
    // Calculate correct profit sharing for ₹2,000 profit
    const profit = project.totalIncome - project.totalExpense;
    const founderShare = profit * 0.7;
    const teamShare = profit * 0.3;
    
    console.log(`\n💰 Correct profit sharing calculation:`);
    console.log(`   Total Profit: ₹${profit}`);
    console.log(`   Founder Share (70%): ₹${founderShare}`);
    console.log(`   Team Share (30%): ₹${teamShare}`);
    
    // Clear existing payroll records for this project
    console.log('\n🗑️ Clearing existing payroll records...');
    await Payroll.deleteMany({ projectId: project._id });
    console.log('✅ Cleared existing payroll records');
    
    // Find founder and team member
    const founderRole = await Role.findOne({ key: 'FOUNDER' });
    const founder = await User.findOne({ roleIds: { $in: [founderRole._id] } });
    const nikhil = await User.findOne({ email: 'nikhiltelase@gmail.com' });
    
    const currentMonth = new Date();
    const monthString = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Create new payroll records
    console.log('\n📝 Creating updated payroll records...');
    
    // Create founder payroll record
    if (founder) {
      await Payroll.create({
        userId: founder._id,
        projectId: project._id,
        teamId: project.teamId,
        baseSalary: 0,
        profitShare: founderShare,
        bonuses: 0,
        deductions: 0,
        month: monthString,
        year: currentMonth.getFullYear(),
        status: 'pending',
        description: `70% CS Profit from ${project.title}`,
        createdBy: founder._id
      });
      console.log(`✅ Created founder payroll: ₹${founderShare}`);
    }
    
    // Create team member payroll record
    if (nikhil) {
      await Payroll.create({
        userId: nikhil._id,
        projectId: project._id,
        teamId: project.teamId,
        baseSalary: 0,
        profitShare: teamShare,
        bonuses: 0,
        deductions: 0,
        month: monthString,
        year: currentMonth.getFullYear(),
        status: 'pending',
        description: `Team Member Share from ${project.title}`,
        createdBy: founder._id
      });
      console.log(`✅ Created Nikhil payroll: ₹${teamShare}`);
    }
    
    // Verify final payroll records
    console.log('\n📊 Final payroll records:');
    const finalPayrolls = await Payroll.find({}).populate('userId', 'name email').populate('projectId', 'title');
    finalPayrolls.forEach((payroll, index) => {
      console.log(`   ${index + 1}. ${payroll.userId?.name}: ₹${payroll.profitShare} (${payroll.projectId?.title})`);
    });
    
    const totalPayroll = finalPayrolls.reduce((sum, p) => sum + p.profitShare, 0);
    console.log(`   Total Payroll: ₹${totalPayroll}`);
    
    console.log('\n🎉 Agriculture Drone project payroll updated correctly!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating Agriculture Drone payroll:', err);
    process.exit(1);
  }
};

updateAgricultureDronePayroll();
