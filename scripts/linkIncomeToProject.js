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

const linkIncomeToProject = async () => {
  try {
    console.log('🔍 Linking income to project...');
    
    const Project = mongoose.model('Project');
    const Income = mongoose.model('Income');
    
    // Find the "test" project
    const project = await Project.findOne({ title: 'test' });
    if (!project) {
      console.log('❌ Project "test" not found');
      return;
    }
    
    console.log(`📋 Found project: ${project.title} (ID: ${project._id})`);
    
    // Find the income record
    const incomeRecord = await Income.findOne({ 
      sourceType: 'Product Sales', 
      amount: 20000 
    });
    
    if (!incomeRecord) {
      console.log('❌ ₹20,000 Product Sales income record not found');
      return;
    }
    
    console.log(`💵 Found income record: ${incomeRecord.sourceType} - ₹${incomeRecord.amount}`);
    console.log(`   Current Project ID: ${incomeRecord.projectId || 'No Project ID'}`);
    console.log(`   Description: ${incomeRecord.description}`);
    
    // Link the income to the project
    incomeRecord.projectId = project._id;
    await incomeRecord.save();
    
    console.log(`✅ Linked income record to project`);
    
    // Update project totals
    const Expense = mongoose.model('Expense');
    const projectIncome = await Income.find({ projectId: project._id });
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
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error linking income to project:', err);
    process.exit(1);
  }
};

linkIncomeToProject();
