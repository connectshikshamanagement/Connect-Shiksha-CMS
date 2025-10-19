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

const fixProjectTotals = async () => {
  try {
    console.log('🔍 Fixing project totals...');
    
    const Project = mongoose.model('Project');
    const Income = mongoose.model('Income');
    const Expense = mongoose.model('Expense');
    
    // Find the "test" project
    const project = await Project.findOne({ title: 'test' });
    if (!project) {
      console.log('❌ Project "test" not found');
      return;
    }
    
    console.log(`📋 Found project: ${project.title} (ID: ${project._id})`);
    
    // Get all income and expense records for this project
    const projectIncome = await Income.find({ projectId: project._id });
    const projectExpenses = await Expense.find({ projectId: project._id });
    
    console.log(`\n💵 Income records linked to project: ${projectIncome.length}`);
    projectIncome.forEach((income, index) => {
      console.log(`   ${index + 1}. ${income.sourceType}: ₹${income.amount}`);
    });
    
    console.log(`\n💸 Expense records linked to project: ${projectExpenses.length}`);
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
    
    // Verify the update
    const updatedProject = await Project.findOne({ title: 'test' });
    console.log(`\n📊 Verified project totals:`);
    console.log(`   Total Income: ₹${updatedProject.totalIncome}`);
    console.log(`   Total Expenses: ₹${updatedProject.totalExpense}`);
    console.log(`   Net Profit: ₹${updatedProject.totalIncome - updatedProject.totalExpense}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing project totals:', err);
    process.exit(1);
  }
};

fixProjectTotals();
