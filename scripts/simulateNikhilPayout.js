const mongoose = require('mongoose');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Project = require('../models/Project');
const User = require('../models/User');
const Team = require('../models/Team');
const Payout = require('../models/Payout');
const Role = require('../models/Role');

async function simulateNikhilPayout() {
  try {
    console.log('🧮 Simulating Nikhil Telase ₹12,000 Payout Calculation');
    console.log('════════════════════════════════════════════════════════════');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-shiksha-crm');
    console.log('✅ MongoDB Connected');

    // Create a simulated Nikhil user for demonstration
    console.log('\n👤 Creating Simulated Nikhil Telase User:');
    const simulatedNikhil = {
      name: 'Nikhil Telase',
      email: 'nikhiltelase@gmail.com',
      role: 'MENTOR',
      team: 'Coaching Center'
    };
    console.log(`   Name: ${simulatedNikhil.name}`);
    console.log(`   Email: ${simulatedNikhil.email}`);
    console.log(`   Role: ${simulatedNikhil.role}`);
    console.log(`   Team: ${simulatedNikhil.team}`);

    // Get current income data
    const allIncome = await Income.find({}).populate('receivedByUserId', 'name email');
    const totalIncome = allIncome.reduce((sum, income) => sum + income.amount, 0);
    
    console.log(`\n📊 Current Income Analysis:`);
    console.log(`   Total Income: ₹${totalIncome.toLocaleString()}`);
    console.log(`   Income Records: ${allIncome.length}`);
    
    allIncome.forEach((income, index) => {
      console.log(`\n   ${index + 1}. ${income.sourceType}: ₹${income.amount.toLocaleString()}`);
      console.log(`      Received By: ${income.receivedByUserId?.name || 'N/A'}`);
      console.log(`      Date: ${income.date.toISOString().split('T')[0]}`);
      console.log(`      Profit Shared: ${income.profitShared}`);
    });

    // Simulate the 70/30 profit sharing calculation
    console.log(`\n💡 Simulating 70/30 Profit Sharing Calculation:`);
    
    // For demonstration, let's assume we have profitable income
    const profitableIncome = allIncome.filter(income => income.amount > 0);
    const totalProfitableIncome = profitableIncome.reduce((sum, income) => sum + income.amount, 0);
    
    console.log(`   Total Profitable Income: ₹${totalProfitableIncome.toLocaleString()}`);
    
    // Simulate project-based profit sharing
    console.log(`\n🏗️ Project-Based Profit Sharing (70/30 Split):`);
    
    // Let's create 2 hypothetical projects for Nikhil's 2 sources
    const project1 = {
      name: 'JEE/NEET Coaching Batch - Oct 2025',
      income: 100000, // ₹1,00,000
      expenses: 20000, // ₹20,000
      profit: 80000,   // ₹80,000
      members: ['Nikhil Telase', 'Mentor 1', 'Mentor 2'] // 3 members
    };
    
    const project2 = {
      name: 'Advanced Physics Workshop',
      income: 60000,  // ₹60,000
      expenses: 10000, // ₹10,000
      profit: 50000,   // ₹50,000
      members: ['Nikhil Telase', 'Coaching Manager'] // 2 members
    };

    console.log(`\n   Project 1: ${project1.name}`);
    console.log(`   Income: ₹${project1.income.toLocaleString()}`);
    console.log(`   Expenses: ₹${project1.expenses.toLocaleString()}`);
    console.log(`   Profit: ₹${project1.profit.toLocaleString()}`);
    console.log(`   Members: ${project1.members.length} (${project1.members.join(', ')})`);
    
    // 70% to founder, 30% to project members
    const founderShare1 = project1.profit * 0.7; // ₹56,000
    const memberShare1 = project1.profit * 0.3; // ₹24,000
    const nikhilShare1 = memberShare1 / project1.members.length; // ₹8,000
    
    console.log(`   Founder Share (70%): ₹${founderShare1.toLocaleString()}`);
    console.log(`   Member Share (30%): ₹${memberShare1.toLocaleString()}`);
    console.log(`   Nikhil's Share: ₹${nikhilShare1.toLocaleString()}`);

    console.log(`\n   Project 2: ${project2.name}`);
    console.log(`   Income: ₹${project2.income.toLocaleString()}`);
    console.log(`   Expenses: ₹${project2.expenses.toLocaleString()}`);
    console.log(`   Profit: ₹${project2.profit.toLocaleString()}`);
    console.log(`   Members: ${project2.members.length} (${project2.members.join(', ')})`);
    
    const founderShare2 = project2.profit * 0.7; // ₹35,000
    const memberShare2 = project2.profit * 0.3; // ₹15,000
    const nikhilShare2 = memberShare2 / project2.members.length; // ₹7,500
    
    console.log(`   Founder Share (70%): ₹${founderShare2.toLocaleString()}`);
    console.log(`   Member Share (30%): ₹${memberShare2.toLocaleString()}`);
    console.log(`   Nikhil's Share: ₹${nikhilShare2.toLocaleString()}`);

    // Calculate total payout
    const totalNikhilShare = nikhilShare1 + nikhilShare2;
    
    console.log(`\n💰 Nikhil's Total Payout Calculation:`);
    console.log(`   Source 1 (${project1.name}): ₹${nikhilShare1.toLocaleString()}`);
    console.log(`   Source 2 (${project2.name}): ₹${nikhilShare2.toLocaleString()}`);
    console.log(`   Total Profit Shares: ₹${totalNikhilShare.toLocaleString()}`);
    console.log(`   Base Salary: ₹0`);
    console.log(`   Bonuses: ₹0`);
    console.log(`   Deductions: ₹0`);
    console.log(`   Net Amount: ₹${totalNikhilShare.toLocaleString()}`);

    // Show the detailed breakdown
    console.log(`\n📋 Detailed Payout Breakdown:`);
    console.log(`   Name: Nikhil Telase`);
    console.log(`   Email: nikhiltelase@gmail.com`);
    console.log(`   Base Salary: ₹0`);
    console.log(`   Total Shares: ₹${totalNikhilShare.toLocaleString()}`);
    console.log(`   Sources: 2`);
    console.log(`   Net Amount: ₹${totalNikhilShare.toLocaleString()}`);
    console.log(`   Status: pending`);

    console.log(`\n📊 Profit Sharing Summary:`);
    console.log(`   Project 1: ${project1.name}`);
    console.log(`     - Total Profit: ₹${project1.profit.toLocaleString()}`);
    console.log(`     - Founder (70%): ₹${founderShare1.toLocaleString()}`);
    console.log(`     - Members (30%): ₹${memberShare1.toLocaleString()}`);
    console.log(`     - Nikhil's Share: ₹${nikhilShare1.toLocaleString()}`);
    console.log(`   Project 2: ${project2.name}`);
    console.log(`     - Total Profit: ₹${project2.profit.toLocaleString()}`);
    console.log(`     - Founder (70%): ₹${founderShare2.toLocaleString()}`);
    console.log(`     - Members (30%): ₹${memberShare2.toLocaleString()}`);
    console.log(`     - Nikhil's Share: ₹${nikhilShare2.toLocaleString()}`);
    console.log(`   Total Nikhil Payout: ₹${totalNikhilShare.toLocaleString()}`);

    console.log('\n✅ Nikhil payout simulation completed!');
    
  } catch (error) {
    console.error('❌ Error during simulation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected');
  }
}

simulateNikhilPayout();
