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

const checkProjectFinance = async () => {
  try {
    console.log('🔍 Checking project finance for "tetsaetset"...');
    
    const Project = mongoose.model('Project');
    const Income = mongoose.model('Income');
    const Expense = mongoose.model('Expense');
    const Payroll = mongoose.model('Payroll');
    
    // Find the project
    const project = await Project.findOne({ title: 'tetsaetset' });
    if (!project) {
      console.log('❌ Project "tetsaetset" not found');
      return;
    }
    
    console.log(`\n📋 Project: ${project.title}`);
    console.log(`   Category: ${project.category}`);
    console.log(`   Status: ${project.status}`);
    console.log(`   Total Income (from project): ₹${project.totalIncome || 0}`);
    console.log(`   Total Expense (from project): ₹${project.totalExpense || 0}`);
    console.log(`   Project Profit: ₹${(project.totalIncome || 0) - (project.totalExpense || 0)}`);
    
    // Check income records for this project
    const incomeRecords = await Income.find({ 
      $or: [
        { projectId: project._id },
        { description: { $regex: 'tetsaetset', $options: 'i' } }
      ]
    });
    
    console.log(`\n💵 Income Records (${incomeRecords.length}):`);
    let totalIncome = 0;
    incomeRecords.forEach((income, index) => {
      console.log(`   ${index + 1}. ${income.sourceType}: ₹${income.amount}`);
      console.log(`      Description: ${income.description}`);
      console.log(`      Date: ${income.date}`);
      console.log(`      Project ID: ${income.projectId}`);
      totalIncome += income.amount;
    });
    console.log(`   Total Income: ₹${totalIncome}`);
    
    // Check expense records for this project
    const expenseRecords = await Expense.find({ 
      $or: [
        { projectId: project._id },
        { description: { $regex: 'tetsaetset', $options: 'i' } }
      ]
    });
    
    console.log(`\n💸 Expense Records (${expenseRecords.length}):`);
    let totalExpenses = 0;
    expenseRecords.forEach((expense, index) => {
      console.log(`   ${index + 1}. ${expense.category}: ₹${expense.amount}`);
      console.log(`      Description: ${expense.description}`);
      console.log(`      Date: ${expense.date}`);
      console.log(`      Project ID: ${expense.projectId}`);
      totalExpenses += expense.amount;
    });
    console.log(`   Total Expenses: ₹${totalExpenses}`);
    
    // Calculate actual profit
    const actualProfit = totalIncome - totalExpenses;
    console.log(`\n💰 Actual Profit: ₹${actualProfit}`);
    
    // Check payroll records for this project
    const payrollRecords = await Payroll.find({ projectId: project._id });
    console.log(`\n💼 Payroll Records (${payrollRecords.length}):`);
    let totalPayrollProfit = 0;
    payrollRecords.forEach((payroll, index) => {
      console.log(`   ${index + 1}. ${payroll.userId}: ₹${payroll.profitShare}`);
      totalPayrollProfit += payroll.profitShare;
    });
    console.log(`   Total Payroll Profit: ₹${totalPayrollProfit}`);
    
    // Check if there's a discrepancy
    console.log(`\n🔍 Analysis:`);
    console.log(`   Finance Page Profit: ₹27,000`);
    console.log(`   Actual Calculated Profit: ₹${actualProfit}`);
    console.log(`   Payroll Total: ₹${totalPayrollProfit}`);
    
    if (actualProfit !== 27000) {
      console.log(`   ⚠️  Profit mismatch! Expected ₹27,000, got ₹${actualProfit}`);
    }
    
    if (totalPayrollProfit !== actualProfit) {
      console.log(`   ⚠️  Payroll doesn't match profit! Payroll: ₹${totalPayrollProfit}, Profit: ₹${actualProfit}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking project finance:', err);
    process.exit(1);
  }
};

checkProjectFinance();
