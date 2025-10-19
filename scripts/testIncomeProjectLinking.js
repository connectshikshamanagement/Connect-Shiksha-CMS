const mongoose = require('mongoose');
const Project = require('../models/Project');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Team = require('../models/Team');
const User = require('../models/User');

async function testIncomeProjectLinking() {
  try {
    console.log('🧪 Testing Income Project Linking');
    console.log('════════════════════════════════════════════════════════════');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-shiksha-crm');
    console.log('✅ MongoDB Connected');

    // Get a project with budget
    const project = await Project.findOne({ budget: { $gt: 0 } });
    if (!project) {
      console.log('❌ No project with budget found');
      return;
    }

    console.log(`\n📁 Testing with Project: ${project.title}`);
    console.log(`   Budget: ₹${project.budget.toLocaleString()}`);
    console.log(`   Deal Amount: ₹${project.totalDealAmount?.toLocaleString() || 0}`);

    // Get a user for the income
    const user = await User.findOne({ active: true });
    if (!user) {
      console.log('❌ No active user found');
      return;
    }

    // Create test income linked to the project
    const testIncome = await Income.create({
      sourceType: 'Coaching',
      amount: 25000,
      date: new Date(),
      description: 'Test income linked to project',
      paymentMethod: 'bank_transfer',
      sourceRefId: project._id,
      sourceRefModel: 'Project',
      receivedByUserId: user._id,
      teamId: project.teamId
    });

    console.log(`✅ Created test income: ₹${testIncome.amount.toLocaleString()}`);
    console.log(`   Linked to project: ${project.title}`);
    console.log(`   sourceRefId: ${testIncome.sourceRefId}`);
    console.log(`   sourceRefModel: ${testIncome.sourceRefModel}`);

    // Create test expense linked to the project
    const testExpense = await Expense.create({
      category: 'Logistics',
      amount: 10000,
      date: new Date(),
      description: 'Test expense linked to project',
      paymentMethod: 'bank_transfer',
      projectId: project._id,
      teamId: project.teamId,
      submittedBy: user._id
    });

    console.log(`✅ Created test expense: ₹${testExpense.amount.toLocaleString()}`);
    console.log(`   Linked to project: ${project.title}`);
    console.log(`   projectId: ${testExpense.projectId}`);

    // Now test the budget warnings API
    console.log(`\n📊 Testing budget warnings with linked data:`);
    
    const expenses = await Expense.find({ projectId: project._id });
    const incomes = await Income.find({ 
      sourceRefId: project._id, 
      sourceRefModel: 'Project' 
    });

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const budgetUtilization = project.budget > 0 ? Math.round((totalExpenses / project.budget) * 100) : 0;
    const dealCollection = project.totalDealAmount > 0 ? Math.round((totalIncome / project.totalDealAmount) * 100) : 0;

    console.log(`   Total Income: ₹${totalIncome.toLocaleString()}`);
    console.log(`   Total Expenses: ₹${totalExpenses.toLocaleString()}`);
    console.log(`   Budget Utilization: ${budgetUtilization}%`);
    console.log(`   Deal Collection: ${dealCollection}%`);

    // Clean up test data
    await Income.findByIdAndDelete(testIncome._id);
    await Expense.findByIdAndDelete(testExpense._id);
    console.log(`\n🧹 Cleaned up test data`);

    console.log('\n✅ Income project linking test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected');
  }
}

testIncomeProjectLinking();
