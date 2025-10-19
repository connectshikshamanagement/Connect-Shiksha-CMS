const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Project = require('../models/Project');
const Team = require('../models/Team');
const User = require('../models/User');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Payout = require('../models/Payout');
const { computeProjectProfitSharing } = require('../utils/projectProfitSharing');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const testBudgetAndDealAmount = async () => {
  try {
    console.log('🧪 Testing Budget Utilization & Deal Amount Features');
    console.log('════════════════════════════════════════════════════════════');

    // Clear existing payouts and reset income profit sharing
    await Payout.deleteMany({});
    await Income.updateMany({}, { profitShared: false });
    console.log('🗑️ Cleared existing payouts and reset income profit sharing');

    // Get teams and users
    const teams = await Team.find().populate('members');
    const users = await User.find({ active: true });

    // Find founder
    const founder = users.find(user => 
      user.roleIds && user.roleIds.some(role => role.key === 'FOUNDER')
    );

    console.log(`\n👑 Founder: ${founder?.name} (${founder?.email})`);

    if (!founder) {
      console.log('❌ No founder found. Creating a test founder...');
      
      // Check if test founder already exists
      let testFounder = await User.findOne({ email: 'test-founder@example.com' });
      
      if (!testFounder) {
        testFounder = await User.create({
          name: 'Test Founder',
          email: 'test-founder@example.com',
          passwordHash: 'hashedpassword123',
          phone: '1234567890',
          roleIds: [], // Will be set after role creation
          active: true
        });
      }

      // Find FOUNDER role and assign it
      const Role = require('../models/Role');
      const founderRole = await Role.findOne({ key: 'FOUNDER' });
      if (founderRole && !testFounder.roleIds.includes(founderRole._id)) {
        testFounder.roleIds = [founderRole._id];
        await testFounder.save();
      }
      console.log(`✅ Using test founder: ${testFounder.name}`);
    }

    // Create test project with budget and deal amount
    const coachingTeam = teams.find(t => t.name === 'Coaching Center Team');
    const selectedMembers = users.slice(0, 2); // Select 2 users as project members
    const actualFounder = founder || await User.findOne({ email: 'test-founder@example.com' });

    const testProject = await Project.create({
      title: 'Test Project - Budget & Deal Amount',
      description: 'Testing budget utilization and deal amount features',
      category: 'Innovation',
      teamId: coachingTeam._id,
      projectMembers: [...selectedMembers.map(u => u._id), actualFounder._id], // Include founder
      ownerId: users[0]._id,
      budget: 50000, // Set budget
      totalDealAmount: 100000, // Set deal amount
      startDate: new Date(),
      status: 'active'
    });

    console.log(`\n✅ Created test project: ${testProject.title}`);
    console.log(`   Team: ${coachingTeam.name}`);
    console.log(`   Budget: ₹${testProject.budget.toLocaleString()}`);
    console.log(`   Deal Amount: ₹${testProject.totalDealAmount.toLocaleString()}`);
    console.log(`   Project Members: ${testProject.projectMembers.length}`);
    console.log(`   Members: ${selectedMembers.map(m => m.name).join(', ')}, ${actualFounder.name}`);

    // Create test expenses to test budget utilization
    const testExpense1 = await Expense.create({
      category: 'Logistics',
      amount: 30000, // 60% of budget
      teamId: coachingTeam._id,
      projectId: testProject._id,
      submittedBy: users[0]._id,
      description: 'Test expense 1'
    });

    const testExpense2 = await Expense.create({
      category: 'Marketing',
      amount: 25000, // Total expenses = 55,000 (110% of budget)
      teamId: coachingTeam._id,
      projectId: testProject._id,
      submittedBy: users[0]._id,
      description: 'Test expense 2'
    });

    console.log(`\n💸 Created test expenses:`);
    console.log(`   Expense 1: ₹${testExpense1.amount.toLocaleString()}`);
    console.log(`   Expense 2: ₹${testExpense2.amount.toLocaleString()}`);
    console.log(`   Total Expenses: ₹${(testExpense1.amount + testExpense2.amount).toLocaleString()}`);
    console.log(`   Budget Utilization: ${Math.round((testExpense1.amount + testExpense2.amount) / testProject.budget * 100)}%`);

    // Calculate expected profit using deal amount
    const expectedProfit = testProject.totalDealAmount - (testExpense1.amount + testExpense2.amount);
    const expectedFounderShare = (expectedProfit * 70) / 100;
    const expectedMemberShare = (expectedProfit * 30) / 100;
    const expectedPerMember = expectedMemberShare / (testProject.projectMembers.length - 1); // Exclude founder from member count

    console.log(`\n📊 Expected Profit Distribution (using Deal Amount):`);
    console.log(`   Deal Amount: ₹${testProject.totalDealAmount.toLocaleString()}`);
    console.log(`   Total Expenses: ₹${(testExpense1.amount + testExpense2.amount).toLocaleString()}`);
    console.log(`   Project Profit: ₹${expectedProfit.toLocaleString()}`);
    console.log(`   Founder (70%): ₹${expectedFounderShare.toLocaleString()}`);
    console.log(`   Project Members (30%): ₹${expectedMemberShare.toLocaleString()}`);
    console.log(`   Per Project Member: ₹${expectedPerMember.toLocaleString()}`);

    // Run the profit sharing computation
    console.log(`\n🔄 Computing project-based profit sharing...`);
    await computeProjectProfitSharing(testProject._id, 10, 2025);

    // Check results
    console.log(`\n📋 Results:`);
    const payouts = await Payout.find().populate('userId', 'name email');
    
    const founderPayout = payouts.find(p => p.userId.email === actualFounder.email);
    const memberPayouts = payouts.filter(p => p.userId.email !== actualFounder.email);

    if (founderPayout) {
      console.log(`\n👑 Founder Payout:`);
      console.log(`   Name: ${founderPayout.userId.name}`);
      console.log(`   Email: ${founderPayout.userId.email}`);
      console.log(`   Total Shares: ₹${founderPayout.totalShares.toLocaleString()}`);
      console.log(`   Net Amount: ₹${founderPayout.netAmount.toLocaleString()}`);
      console.log(`   Sources: ${founderPayout.shares.length}`);
      founderPayout.shares.forEach((share, index) => {
        console.log(`      ${index + 1}. ${share.description}: ₹${share.amount.toLocaleString()}`);
      });
    }

    console.log(`\n👥 Project Member Payouts:`);
    memberPayouts.forEach((payout, index) => {
      console.log(`\n   ${index + 1}. ${payout.userId.name} (${payout.userId.email})`);
      console.log(`      Total Shares: ₹${payout.totalShares.toLocaleString()}`);
      console.log(`      Net Amount: ₹${payout.netAmount.toLocaleString()}`);
      console.log(`      Sources: ${payout.shares.length}`);
      payout.shares.forEach((share, shareIndex) => {
        console.log(`         ${shareIndex + 1}. ${share.description}: ₹${share.amount.toLocaleString()}`);
      });
    });

    // Verify the distribution
    console.log(`\n✅ Verification:`);
    console.log(`   Expected Founder Share: ₹${expectedFounderShare.toLocaleString()}`);
    console.log(`   Actual Founder Share: ₹${founderPayout?.totalShares.toLocaleString() || 0}`);
    console.log(`   Expected Per Member: ₹${expectedPerMember.toLocaleString()}`);
    console.log(`   Actual Per Member: ₹${memberPayouts[0]?.totalShares.toLocaleString() || 0}`);
    
    const isCorrect = Math.abs((founderPayout?.totalShares || 0) - expectedFounderShare) < 1 && 
                     Math.abs((memberPayouts[0]?.totalShares || 0) - expectedPerMember) < 1;
    
    console.log(`   ✅ Distribution is ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);

    // Test budget utilization
    console.log(`\n📊 Budget Utilization Test:`);
    console.log(`   Budget: ₹${testProject.budget.toLocaleString()}`);
    console.log(`   Total Expenses: ₹${(testExpense1.amount + testExpense2.amount).toLocaleString()}`);
    console.log(`   Utilization: ${Math.round((testExpense1.amount + testExpense2.amount) / testProject.budget * 100)}%`);
    console.log(`   Status: ${(testExpense1.amount + testExpense2.amount) > testProject.budget ? 'OVER BUDGET' : 'WITHIN BUDGET'}`);

    // Clean up test data
    await Project.findByIdAndDelete(testProject._id);
    await Expense.findByIdAndDelete(testExpense1._id);
    await Expense.findByIdAndDelete(testExpense2._id);
    await Payout.deleteMany({});
    console.log(`\n🧹 Cleaned up test data`);

    console.log(`\n✅ Test completed successfully!`);

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    mongoose.connection.close();
  }
};

testBudgetAndDealAmount();
