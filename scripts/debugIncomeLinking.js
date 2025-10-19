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

const debugIncomeLinking = async () => {
  try {
    console.log('🔍 Debugging income linking...');
    
    const Project = mongoose.model('Project');
    const Income = mongoose.model('Income');
    
    // Find the "test" project
    const project = await Project.findOne({ title: 'test' });
    if (!project) {
      console.log('❌ Project "test" not found');
      return;
    }
    
    console.log(`📋 Project: ${project.title} (ID: ${project._id})`);
    
    // Find all income records
    const allIncome = await Income.find({});
    console.log(`\n💵 All Income Records (${allIncome.length}):`);
    
    allIncome.forEach((income, index) => {
      console.log(`\n${index + 1}. ${income.sourceType}: ₹${income.amount}`);
      console.log(`   ID: ${income._id}`);
      console.log(`   Project ID: ${income.projectId || 'No Project ID'}`);
      console.log(`   Description: ${income.description}`);
      console.log(`   Date: ${income.date}`);
    });
    
    // Try to link the income record directly by ID
    const incomeRecord = await Income.findOne({ amount: 20000 });
    if (incomeRecord) {
      console.log(`\n🔗 Linking income record ${incomeRecord._id} to project ${project._id}`);
      
      // Update the income record
      const updateResult = await Income.updateOne(
        { _id: incomeRecord._id },
        { $set: { projectId: project._id } }
      );
      
      console.log(`✅ Update result: ${updateResult.modifiedCount} record(s) modified`);
      
      // Verify the update
      const updatedIncome = await Income.findById(incomeRecord._id);
      console.log(`✅ Verified: Income now has Project ID: ${updatedIncome.projectId}`);
    }
    
    // Check project totals after linking
    const projectIncome = await Income.find({ projectId: project._id });
    console.log(`\n💰 Project income records: ${projectIncome.length}`);
    projectIncome.forEach((income, index) => {
      console.log(`   ${index + 1}. ${income.sourceType}: ₹${income.amount}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error debugging income linking:', err);
    process.exit(1);
  }
};

debugIncomeLinking();
