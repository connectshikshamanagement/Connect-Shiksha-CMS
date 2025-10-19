const mongoose = require('mongoose');
const Project = require('../models/Project');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Team = require('../models/Team');
const User = require('../models/User');

async function testProjectBudget() {
  try {
    console.log('🧪 Testing Project Budget Utilization');
    console.log('════════════════════════════════════════════════════════════');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-shiksha-crm');
    console.log('✅ MongoDB Connected');

    // Get all projects
    const projects = await Project.find()
      .populate('teamId', 'name')
      .populate('ownerId', 'name email')
      .populate('projectMembers', 'name email');

    console.log(`\n📊 Found ${projects.length} projects:`);

    // Calculate budget utilization for each project
    for (const project of projects) {
      const expenses = await Expense.find({ projectId: project._id });
      const incomes = await Income.find({ 
        sourceRefId: project._id, 
        sourceRefModel: 'Project' 
      });

      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
      const budgetUtilization = project.budget > 0 ? Math.round((totalExpenses / project.budget) * 100) : 0;
      const dealCollection = project.totalDealAmount > 0 ? Math.round((totalIncome / project.totalDealAmount) * 100) : 0;

      console.log(`\n📁 ${project.title}`);
      console.log(`   Budget: ₹${project.budget?.toLocaleString() || 0}`);
      console.log(`   Deal Amount: ₹${project.totalDealAmount?.toLocaleString() || 0}`);
      console.log(`   Total Expenses: ₹${totalExpenses.toLocaleString()}`);
      console.log(`   Total Income: ₹${totalIncome.toLocaleString()}`);
      console.log(`   Budget Utilization: ${budgetUtilization}%`);
      console.log(`   Deal Collection: ${dealCollection}%`);
      
      if (budgetUtilization > 100) {
        console.log(`   ⚠️  OVER BUDGET by ₹${(totalExpenses - project.budget).toLocaleString()}`);
      } else if (budgetUtilization > 80) {
        console.log(`   ⚠️  Near budget limit`);
      } else {
        console.log(`   ✅ Within budget`);
      }
    }

    console.log('\n✅ Project budget test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected');
  }
}

testProjectBudget();
