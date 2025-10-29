const mongoose = require('mongoose');
require('dotenv').config();

// Load all models
const Project = require('../models/Project');
const User = require('../models/User');
const Team = require('../models/Team');
const Role = require('../models/Role');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Payroll = require('../models/Payroll');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const checkData = async () => {
  try {
    const project = await Project.findOne({ title: 'demo' });
    
    console.log('\n🔍 CHECKING PAYROLL RECORD DATA\n');
    
    const payrolls = await Payroll.find({
      projectId: project._id,
      month: '2025-10'
    }).populate('userId', 'name email');
    
    payrolls.forEach(p => {
      console.log(`\n👤 ${p.userId.name} (${p.userId.email}):`);
      console.log(`  profitShare: ₹${p.profitShare}`);
      console.log(`  projectIncome: ₹${p.projectIncome}`);
      console.log(`  projectExpenses: ₹${p.projectExpenses}`);
      console.log(`  netProfit (calc): ₹${(p.projectIncome || 0) - (p.projectExpenses || 0)}`);
      console.log(`  netProfit (stored): ₹${p.netProfit}`);
      
      const totalProfit = (p.projectIncome || 0) - (p.projectExpenses || 0);
      const percentage = totalProfit > 0 ? ((p.profitShare / totalProfit) * 100).toFixed(2) : 0;
      console.log(`  Percentage: ${percentage}%`);
      console.log(`  ownerBonus: ₹${p.ownerBonus || 0}`);
      console.log(`  isProjectOwner: ${p.isProjectOwner || false}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkData();
