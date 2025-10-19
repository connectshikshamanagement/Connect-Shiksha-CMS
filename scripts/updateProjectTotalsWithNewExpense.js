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

const updateProjectTotalsWithNewExpense = async () => {
  try {
    console.log('🔍 Updating project totals with new expense...');
    
    const Project = mongoose.model('Project');
    const Income = mongoose.model('Income');
    const Expense = mongoose.model('Expense');
    const Payroll = mongoose.model('Payroll');
    
    // Find the Agriculture Drone project
    const project = await Project.findOne({ title: 'Agriculture Drone' });
    if (!project) {
      console.log('❌ Agriculture Drone project not found');
      return;
    }
    
    console.log(`\n📋 Project: ${project.title} (ID: ${project._id})`);
    
    // Get all income and expense records for this project
    const projectIncome = await Income.find({ 
      sourceRefId: project._id, 
      sourceRefModel: 'Project' 
    });
    const projectExpenses = await Expense.find({ projectId: project._id });
    
    console.log(`\n💵 Income records: ${projectIncome.length}`);
    projectIncome.forEach((income, index) => {
      console.log(`   ${index + 1}. ${income.sourceType}: ₹${income.amount}`);
    });
    
    console.log(`\n💸 Expense records: ${projectExpenses.length}`);
    projectExpenses.forEach((expense, index) => {
      console.log(`   ${index + 1}. ${expense.category}: ₹${expense.amount}`);
    });
    
    // Calculate totals
    const totalIncome = projectIncome.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = projectExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    console.log(`\n💰 Calculated totals:`);
    console.log(`   Total Income: ₹${totalIncome}`);
    console.log(`   Total Expenses: ₹${totalExpenses}`);
    console.log(`   Net Profit: ₹${totalIncome - totalExpenses}`);
    
    // Update project totals
    project.totalIncome = totalIncome;
    project.totalExpense = totalExpenses;
    await project.save();
    
    console.log(`\n✅ Updated project totals in database`);
    
    // Clear existing payroll and recalculate
    const profit = totalIncome - totalExpenses;
    const founderShare = profit * 0.7;
    const teamShare = profit * 0.3;
    
    console.log(`\n🔄 Recalculating payroll for new profit: ₹${profit}`);
    console.log(`   Founder Share (70%): ₹${founderShare}`);
    console.log(`   Team Share (30%): ₹${teamShare}`);
    
    // Clear existing payroll records
    await Payroll.deleteMany({ projectId: project._id });
    
    // Create new payroll records
    const User = mongoose.model('User');
    const Role = mongoose.model('Role');
    
    const founderRole = await Role.findOne({ key: 'FOUNDER' });
    const founder = await User.findOne({ roleIds: { $in: [founderRole._id] } });
    const nikhil = await User.findOne({ email: 'nikhiltelase@gmail.com' });
    
    const currentMonth = new Date();
    const monthString = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}`;
    
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
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating project totals with new expense:', err);
    process.exit(1);
  }
};

updateProjectTotalsWithNewExpense();
