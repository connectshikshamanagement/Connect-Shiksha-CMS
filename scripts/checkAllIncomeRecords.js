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

const checkAllIncomeRecords = async () => {
  try {
    console.log('🔍 Checking ALL income records...');
    
    const Income = mongoose.model('Income');
    const Project = mongoose.model('Project');
    
    // Get all income records
    const allIncome = await Income.find({});
    console.log(`\n💵 All Income Records (${allIncome.length}):`);
    
    let totalIncome = 0;
    allIncome.forEach((income, index) => {
      console.log(`\n${index + 1}. ${income.sourceType}: ₹${income.amount}`);
      console.log(`   Description: ${income.description}`);
      console.log(`   Date: ${income.date}`);
      console.log(`   Project ID: ${income.projectId || 'No Project ID'}`);
      console.log(`   Received by: ${income.receivedByUserId || 'No User ID'}`);
      totalIncome += income.amount;
    });
    
    console.log(`\n💰 Total Income: ₹${totalIncome}`);
    
    // Check all projects
    const projects = await Project.find({});
    console.log(`\n📋 All Projects (${projects.length}):`);
    projects.forEach((project, index) => {
      console.log(`\n${index + 1}. ${project.title}`);
      console.log(`   ID: ${project._id}`);
      console.log(`   Category: ${project.category}`);
      console.log(`   Total Income (from project): ₹${project.totalIncome || 0}`);
      console.log(`   Total Expense (from project): ₹${project.totalExpense || 0}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking income records:', err);
    process.exit(1);
  }
};

checkAllIncomeRecords();
