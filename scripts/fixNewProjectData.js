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

const fixNewProjectData = async () => {
  try {
    console.log('🔍 Fixing new project data...');
    
    const Project = mongoose.model('Project');
    const Income = mongoose.model('Income');
    const Expense = mongoose.model('Expense');
    const Payroll = mongoose.model('Payroll');
    
    // Step 1: Clear old payroll records
    console.log('\n🗑️ Clearing old payroll records...');
    const deleteResult = await Payroll.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} old payroll records`);
    
    // Step 2: Find the "test" project
    const project = await Project.findOne({ title: 'test' });
    if (!project) {
      console.log('❌ Project "test" not found');
      return;
    }
    
    console.log(`\n📋 Found project: ${project.title} (ID: ${project._id})`);
    
    // Step 3: Link income to project
    const incomeRecord = await Income.findOne({ 
      sourceType: 'Product Sales', 
      amount: 20000,
      projectId: null 
    });
    
    if (incomeRecord) {
      incomeRecord.projectId = project._id;
      await incomeRecord.save();
      console.log('✅ Linked ₹20,000 income to "test" project');
    } else {
      console.log('⚠️ Income record not found or already linked');
    }
    
    // Step 4: Update project totals
    const projectIncome = await Income.find({ projectId: project._id });
    const projectExpenses = await Expense.find({ projectId: project._id });
    
    const totalIncome = projectIncome.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = projectExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    project.totalIncome = totalIncome;
    project.totalExpense = totalExpenses;
    await project.save();
    
    console.log(`✅ Updated project totals: Income: ₹${totalIncome}, Expenses: ₹${totalExpenses}`);
    console.log(`💰 Project profit: ₹${totalIncome - totalExpenses}`);
    
    // Step 5: Recalculate profit sharing for the new project
    console.log('\n🔄 Calculating profit sharing for new project...');
    
    const { computeProjectProfitSharing } = require('../utils/projectProfitSharing');
    const result = await computeProjectProfitSharing(project._id);
    
    console.log('✅ Profit sharing calculated:');
    console.log(`   Total profit: ₹${result.profit}`);
    console.log(`   Founder share: ₹${result.founderShare}`);
    console.log(`   Share per person: ₹${result.sharePerPerson}`);
    
    // Step 6: Verify final data
    console.log('\n📊 Final verification...');
    const finalPayrolls = await Payroll.find({}).populate('userId', 'name email').populate('projectId', 'title');
    console.log(`\n💼 New Payroll Records (${finalPayrolls.length}):`);
    finalPayrolls.forEach((payroll, index) => {
      console.log(`   ${index + 1}. ${payroll.userId?.name}: ₹${payroll.profitShare} (${payroll.projectId?.title})`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing new project data:', err);
    process.exit(1);
  }
};

fixNewProjectData();
