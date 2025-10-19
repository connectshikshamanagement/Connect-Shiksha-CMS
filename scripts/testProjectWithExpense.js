const mongoose = require('mongoose');
const Project = require('../models/Project');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Team = require('../models/Team');
const User = require('../models/User');

async function testProjectWithExpense() {
  try {
    console.log('🧪 Testing Project with Expense');
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

    console.log(`\n📁 Testing Project: ${project.title}`);
    console.log(`   Budget: ₹${project.budget.toLocaleString()}`);

    // Create a test expense for this project
    const testExpense = await Expense.create({
      category: 'Logistics',
      amount: 15000,
      date: new Date(),
      description: 'Test expense for budget utilization',
      paymentMethod: 'bank_transfer',
      projectId: project._id,
      teamId: project.teamId,
      submittedBy: project.ownerId
    });

    console.log(`✅ Created test expense: ₹${testExpense.amount.toLocaleString()}`);

    // Now test the budget calculation
    const expenses = await Expense.find({ projectId: project._id });
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const budgetUtilization = Math.round((totalExpenses / project.budget) * 100);

    console.log(`\n📊 Budget Calculation:`);
    console.log(`   Total Expenses: ₹${totalExpenses.toLocaleString()}`);
    console.log(`   Budget Utilization: ${budgetUtilization}%`);
    
    if (budgetUtilization > 100) {
      console.log(`   ⚠️  OVER BUDGET by ₹${(totalExpenses - project.budget).toLocaleString()}`);
    } else if (budgetUtilization > 80) {
      console.log(`   ⚠️  Near budget limit`);
    } else {
      console.log(`   ✅ Within budget`);
    }

    // Clean up test expense
    await Expense.findByIdAndDelete(testExpense._id);
    console.log(`\n🧹 Cleaned up test expense`);

    console.log('\n✅ Project budget test with expense completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected');
  }
}

testProjectWithExpense();
