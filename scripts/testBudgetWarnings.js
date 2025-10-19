const mongoose = require('mongoose');
const { getBudgetWarnings, getProjectFinancialSummary } = require('../utils/budgetTracking');

async function testBudgetWarnings() {
  try {
    console.log('🧪 Testing Budget Warnings API');
    console.log('════════════════════════════════════════════════════════════');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-shiksha-crm');
    console.log('✅ MongoDB Connected');

    // Test budget warnings
    console.log('\n📊 Getting budget warnings...');
    const warnings = await getBudgetWarnings();
    
    console.log(`\n📋 Found ${warnings.length} projects with budgets:`);
    
    warnings.forEach((warning, index) => {
      console.log(`\n${index + 1}. ${warning.projectTitle}`);
      console.log(`   Budget: ₹${warning.budget.toLocaleString()}`);
      console.log(`   Expenses: ₹${warning.totalExpenses.toLocaleString()}`);
      console.log(`   Income: ₹${warning.totalIncome.toLocaleString()}`);
      console.log(`   Deal Amount: ₹${warning.dealAmount.toLocaleString()}`);
      console.log(`   Budget Utilization: ${warning.budgetUtilization}%`);
      console.log(`   Deal Collection: ${warning.dealCollection}%`);
      console.log(`   Warning Level: ${warning.warningLevel}`);
      if (warning.message) {
        console.log(`   Message: ${warning.message}`);
      }
    });

    // Test project financial summary for first project
    if (warnings.length > 0) {
      console.log(`\n🔍 Testing project financial summary for: ${warnings[0].projectTitle}`);
      const summary = await getProjectFinancialSummary(warnings[0].projectId);
      
      if (summary) {
        console.log('\n📊 Project Financial Summary:');
        console.log(`   Project: ${summary.project.title}`);
        console.log(`   Budget: ₹${summary.project.budget.toLocaleString()}`);
        console.log(`   Deal Amount: ₹${summary.project.totalDealAmount.toLocaleString()}`);
        console.log(`   Total Income: ₹${summary.financials.totalIncome.toLocaleString()}`);
        console.log(`   Total Expenses: ₹${summary.financials.totalExpenses.toLocaleString()}`);
        console.log(`   Profit: ₹${summary.financials.profit.toLocaleString()}`);
        console.log(`   Budget Utilization: ${summary.financials.budgetUtilization}%`);
        console.log(`   Deal Collection: ${summary.financials.dealCollection}%`);
        console.log(`   Budget Exceeded: ${summary.warnings.budgetExceeded}`);
        console.log(`   Budget Warning: ${summary.warnings.budgetWarning}`);
        console.log(`   Deal Complete: ${summary.warnings.dealComplete}`);
      }
    }

    console.log('\n✅ Budget warnings test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected');
  }
}

testBudgetWarnings();
