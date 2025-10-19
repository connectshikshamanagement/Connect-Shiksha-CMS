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

const checkAgricultureDroneProject = async () => {
  try {
    console.log('🔍 Checking Agriculture Drone project data...');
    
    const Project = mongoose.model('Project');
    const Income = mongoose.model('Income');
    const Expense = mongoose.model('Expense');
    const Payroll = mongoose.model('Payroll');
    
    // Check all projects
    const projects = await Project.find({});
    console.log(`\n📋 Current Projects (${projects.length}):`);
    projects.forEach((project, index) => {
      console.log(`\n${index + 1}. ${project.title}`);
      console.log(`   Category: ${project.category}`);
      console.log(`   Status: ${project.status}`);
      console.log(`   Total Income: ₹${project.totalIncome || 0}`);
      console.log(`   Total Expense: ₹${project.totalExpense || 0}`);
      console.log(`   Profit: ₹${(project.totalIncome || 0) - (project.totalExpense || 0)}`);
    });
    
    // Check income records
    const incomeRecords = await Income.find({});
    console.log(`\n💵 Current Income Records (${incomeRecords.length}):`);
    incomeRecords.forEach((income, index) => {
      console.log(`\n${index + 1}. ${income.sourceType}: ₹${income.amount}`);
      console.log(`   Description: ${income.description}`);
      console.log(`   sourceRefId: ${income.sourceRefId || 'No sourceRefId'}`);
      console.log(`   sourceRefModel: ${income.sourceRefModel || 'No sourceRefModel'}`);
    });
    
    // Check expense records
    const expenseRecords = await Expense.find({});
    console.log(`\n💸 Current Expense Records (${expenseRecords.length}):`);
    expenseRecords.forEach((expense, index) => {
      console.log(`\n${index + 1}. ${expense.category}: ₹${expense.amount}`);
      console.log(`   Description: ${expense.description}`);
      console.log(`   Project ID: ${expense.projectId || 'No Project ID'}`);
    });
    
    // Check payroll records
    const payrollRecords = await Payroll.find({}).populate('userId', 'name email').populate('projectId', 'title');
    console.log(`\n💼 Current Payroll Records (${payrollRecords.length}):`);
    payrollRecords.forEach((payroll, index) => {
      console.log(`\n${index + 1}. ${payroll.userId?.name}`);
      console.log(`   Project: ${payroll.projectId?.title || 'N/A'}`);
      console.log(`   Profit Share: ₹${payroll.profitShare || 0}`);
      console.log(`   Description: ${payroll.description}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking Agriculture Drone project:', err);
    process.exit(1);
  }
};

checkAgricultureDroneProject();
