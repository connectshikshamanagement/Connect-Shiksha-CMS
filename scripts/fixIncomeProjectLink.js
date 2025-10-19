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

const fixIncomeProjectLink = async () => {
  try {
    console.log('🔍 Fixing income project link with correct fields...');
    
    const Project = mongoose.model('Project');
    const Income = mongoose.model('Income');
    
    // Find the "test" project
    const project = await Project.findOne({ title: 'test' });
    if (!project) {
      console.log('❌ Project "test" not found');
      return;
    }
    
    console.log(`📋 Project: ${project.title} (ID: ${project._id})`);
    
    // Find the income record
    const incomeRecord = await Income.findOne({ amount: 20000 });
    if (!incomeRecord) {
      console.log('❌ ₹20,000 income record not found');
      return;
    }
    
    console.log(`💵 Income record: ${incomeRecord.sourceType} - ₹${incomeRecord.amount}`);
    console.log(`   Current sourceRefId: ${incomeRecord.sourceRefId || 'No sourceRefId'}`);
    console.log(`   Current sourceRefModel: ${incomeRecord.sourceRefModel || 'No sourceRefModel'}`);
    
    // Link the income to the project using correct fields
    incomeRecord.sourceRefId = project._id;
    incomeRecord.sourceRefModel = 'Project';
    await incomeRecord.save();
    
    console.log(`✅ Linked income record to project using sourceRefId`);
    
    // Update project totals
    const Expense = mongoose.model('Expense');
    const projectIncome = await Income.find({ 
      sourceRefId: project._id, 
      sourceRefModel: 'Project' 
    });
    const projectExpenses = await Expense.find({ projectId: project._id });
    
    const totalIncome = projectIncome.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = projectExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    project.totalIncome = totalIncome;
    project.totalExpense = totalExpenses;
    await project.save();
    
    console.log(`\n✅ Updated project totals:`);
    console.log(`   Total Income: ₹${totalIncome}`);
    console.log(`   Total Expenses: ₹${totalExpenses}`);
    console.log(`   Net Profit: ₹${totalIncome - totalExpenses}`);
    
    // Recalculate profit sharing
    console.log('\n🔄 Recalculating profit sharing...');
    const { computeProjectProfitSharing } = require('../utils/projectProfitSharing');
    const result = await computeProjectProfitSharing(project._id);
    
    console.log('✅ Profit sharing recalculated:');
    console.log(`   Total profit: ₹${result.profit}`);
    console.log(`   Founder share: ₹${result.founderShare}`);
    console.log(`   Share per person: ₹${result.sharePerPerson}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing income project link:', err);
    process.exit(1);
  }
};

fixIncomeProjectLink();
