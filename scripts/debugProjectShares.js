const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const debugProject = async () => {
  try {
    const project = await Project.findOne({ title: 'demo' }).populate('projectMembers');
    
    console.log('\n📁 PROJECT INFO:');
    console.log('Title:', project.title);
    console.log('Start Date:', project.startDate);
    console.log('Status:', project.status);
    
    console.log('\n👥 PROJECT MEMBERS:', project.projectMembers.length);
    project.projectMembers.forEach(m => {
      console.log(`  - ${m.name} (${m.email})`);
    });
    
    console.log('\n📋 MEMBER DETAILS:', project.memberDetails.length);
    project.memberDetails.forEach(detail => {
      console.log(`  - User ID: ${detail.userId}`);
      console.log(`    Joined: ${detail.joinedDate}`);
      console.log(`    Active: ${detail.isActive}`);
    });
    
    // Check income
    const incomes = await Income.find({
      sourceRefId: project._id,
      sourceRefModel: 'Project'
    });
    
    console.log('\n💰 INCOME RECORDS:', incomes.length);
    incomes.forEach(inc => {
      console.log(`  - ₹${inc.amount} on ${inc.date} from ${inc.source}`);
    });
    
    // Check expenses
    const expenses = await Expense.find({
      projectId: project._id
    });
    
    console.log('\n💸 EXPENSE RECORDS:', expenses.length);
    expenses.forEach(exp => {
      console.log(`  - ₹${exp.amount} on ${exp.date} - ${exp.description}`);
    });
    
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalIncome - totalExpense;
    
    console.log('\n💵 FINANCIAL SUMMARY:');
    console.log(`  Total Income: ₹${totalIncome}`);
    console.log(`  Total Expense: ₹${totalExpense}`);
    console.log(`  Profit: ₹${profit}`);
    console.log(`  Founder Share (70%): ₹${Math.round(profit * 0.7)}`);
    console.log(`  Team Share (30%): ₹${Math.round(profit * 0.3)}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

debugProject();

