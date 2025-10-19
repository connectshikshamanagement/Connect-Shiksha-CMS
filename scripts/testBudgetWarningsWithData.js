const mongoose = require('mongoose');
const Project = require('../models/Project');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Team = require('../models/Team');
const User = require('../models/User');
const { getBudgetWarnings } = require('../utils/budgetTracking');

async function testBudgetWarningsWithData() {
  try {
    console.log('🧪 Testing Budget Warnings with Test Data');
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

    // Get a user
    const user = await User.findOne({ active: true });
    if (!user) {
      console.log('❌ No active user found');
      return;
    }

    // Create test income linked to the project
    const testIncome = await Income.create({
      sourceType: 'Coaching',
      amount: 50000,
      date: new Date(),
      description: 'Test income for budget warnings',
      paymentMethod: 'bank_transfer',
      sourceRefId: project._id,
      sourceRefModel: 'Project',
      receivedByUserId: user._id,
      teamId: project.teamId
    });

    console.log(`✅ Created test income: ₹${testIncome.amount.toLocaleString()}`);

    // Create test expense linked to the project
    const testExpense = await Expense.create({
      category: 'Logistics',
      amount: 20000,
      date: new Date(),
      description: 'Test expense for budget warnings',
      paymentMethod: 'bank_transfer',
      projectId: project._id,
      teamId: project.teamId,
      submittedBy: user._id
    });

    console.log(`✅ Created test expense: ₹${testExpense.amount.toLocaleString()}`);

    // Now test the budget warnings API
    console.log(`\n📊 Testing budget warnings API:`);
    const warnings = await getBudgetWarnings();
    
    const projectWarning = warnings.find(w => w.projectId.toString() === project._id.toString());
    if (projectWarning) {
      console.log(`\n📋 Project: ${projectWarning.projectTitle}`);
      console.log(`   Budget: ₹${projectWarning.budget.toLocaleString()}`);
      console.log(`   Expenses: ₹${projectWarning.totalExpenses.toLocaleString()}`);
      console.log(`   Income: ₹${projectWarning.totalIncome.toLocaleString()}`);
      console.log(`   Budget Utilization: ${projectWarning.budgetUtilization}%`);
      console.log(`   Deal Collection: ${projectWarning.dealCollection}%`);
      console.log(`   Warning Level: ${projectWarning.warningLevel}`);
      if (projectWarning.message) {
        console.log(`   Message: ${projectWarning.message}`);
      }
    } else {
      console.log('❌ Project not found in budget warnings');
    }

    // Clean up test data
    await Income.findByIdAndDelete(testIncome._id);
    await Expense.findByIdAndDelete(testExpense._id);
    console.log(`\n🧹 Cleaned up test data`);

    console.log('\n✅ Budget warnings with data test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected');
  }
}

testBudgetWarningsWithData();
