const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import models
const Project = require('../models/Project');
const User = require('../models/User');
const Payroll = require('../models/Payroll');
const Role = require('../models/Role');
const Income = require('../models/Income');
const Expense = require('../models/Expense');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const checkPayrollData = async () => {
  try {
    console.log('🔍 Checking database for payroll issues...');
    
    // Check all projects
    const projects = await Project.find({}).populate('projectMembers', 'name email');
    console.log('\n📋 Projects:');
    projects.forEach(p => {
      console.log(`- ${p.title}: Members: ${p.projectMembers.map(m => m.name).join(', ')}`);
    });
    
    // Check all users and their roles
    const users = await User.find({}).populate('roleIds');
    console.log('\n👥 Users and Roles:');
    users.forEach(u => {
      const roles = u.roleIds.map(r => r.key).join(', ');
      console.log(`- ${u.name} (${u.email}): Roles: [${roles}]`);
    });
    
    // Check payroll records
    const payrolls = await Payroll.find({}).populate('userId', 'name email').populate('projectId', 'title');
    console.log('\n💰 Payroll Records:');
    payrolls.forEach(p => {
      console.log(`- ${p.userId?.name}: Project: ${p.projectId?.title || 'N/A'}, Profit: ₹${p.profitShare || 0}, Status: ${p.status}`);
    });
    
    // Check income records
    const incomes = await Income.find({}).populate('receivedByUserId', 'name email');
    console.log('\n💵 Income Records:');
    incomes.forEach(i => {
      console.log(`- ${i.sourceType}: ₹${i.amount}, Received by: ${i.receivedByUserId?.name}, Profit Shared: ${i.profitShared}`);
    });
    
    // Check expenses
    const expenses = await Expense.find({}).populate('userId', 'name email').populate('projectId', 'title');
    console.log('\n💸 Expense Records:');
    expenses.forEach(e => {
      console.log(`- ${e.category}: ₹${e.amount}, User: ${e.userId?.name}, Project: ${e.projectId?.title || 'N/A'}`);
    });
    
    // Check roles
    const roles = await Role.find({});
    console.log('\n🎭 Roles:');
    roles.forEach(r => {
      console.log(`- ${r.key}: ${r.name}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking database:', err);
    process.exit(1);
  }
};

checkPayrollData();
