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

const testNewProfitSharing = async () => {
  try {
    console.log('🧪 Testing New Project-Based Profit Sharing (70/30 Split)');
    console.log('════════════════════════════════════════════════════════════');

    // Clear existing payouts and reset income profit sharing
    await Payout.deleteMany({});
    await Income.updateMany({}, { profitShared: false });
    console.log('🗑️ Cleared existing payouts and reset income profit sharing');

    // Create a test project with specific members
    const teams = await Team.find().populate('members');
    const users = await User.find({ active: true });

    console.log('\n📋 Available Teams:');
    teams.forEach(team => {
      console.log(`   ${team.name}: ${team.members.length} members`);
      team.members.forEach(member => {
        console.log(`      - ${member.name} (${member.email})`);
      });
    });

    // Create a test project with specific project members
    const coachingTeam = teams.find(t => t.name === 'Coaching Center Team');
    const selectedMembers = users.slice(0, 3); // Select first 3 users as project members

    const testProject = await Project.create({
      title: 'Test Project - 70/30 Split',
      description: 'Testing new profit sharing logic',
      category: 'Innovation',
      teamId: coachingTeam._id,
      projectMembers: selectedMembers.map(u => u._id), // Specific project members
      ownerId: users[0]._id,
      budget: 50000,
      startDate: new Date(),
      status: 'active'
    });

    console.log(`\n✅ Created test project: ${testProject.title}`);
    console.log(`   Team: ${coachingTeam.name}`);
    console.log(`   Project Members: ${selectedMembers.length}`);
    selectedMembers.forEach(member => {
      console.log(`      - ${member.name} (${member.email})`);
    });

    // Create test income for this project
    const testIncome = await Income.create({
      sourceType: 'Product Sales',
      amount: 100000,
      teamId: coachingTeam._id,
      sourceRefId: testProject._id,
      sourceRefModel: 'Project',
      receivedByUserId: users[0]._id,
      profitShared: false
    });

    console.log(`\n💰 Created test income: ₹${testIncome.amount.toLocaleString()}`);

    // Create test expenses for this project
    const testExpense = await Expense.create({
      category: 'Logistics',
      amount: 20000,
      teamId: coachingTeam._id,
      projectId: testProject._id,
      submittedBy: users[0]._id,
      description: 'Test expense for project'
    });

    console.log(`💸 Created test expense: ₹${testExpense.amount.toLocaleString()}`);

    // Calculate expected profit
    const expectedProfit = testIncome.amount - testExpense.amount;
    const expectedFounderShare = (expectedProfit * 70) / 100;
    const expectedMemberShare = (expectedProfit * 30) / 100;
    const expectedPerMember = expectedMemberShare / selectedMembers.length;
    
    // Founder gets 70% + their share of 30% (since they're also a project member)
    const expectedFounderTotal = expectedFounderShare + expectedPerMember;

    console.log(`\n📊 Expected Profit Distribution:`);
    console.log(`   Total Profit: ₹${expectedProfit.toLocaleString()}`);
    console.log(`   Founder (70%): ₹${expectedFounderShare.toLocaleString()}`);
    console.log(`   Project Members (30%): ₹${expectedMemberShare.toLocaleString()}`);
    console.log(`   Per Project Member: ₹${expectedPerMember.toLocaleString()}`);
    console.log(`   Founder Total (70% + member share): ₹${expectedFounderTotal.toLocaleString()}`);

    // Run the profit sharing computation
    console.log(`\n🔄 Computing project-based profit sharing...`);
    await computeProjectProfitSharing(testProject._id, 10, 2025);

    // Check results
    console.log(`\n📋 Results:`);
    const payouts = await Payout.find().populate('userId', 'name email');
    
    const founderPayout = payouts.find(p => p.userId.email === 'founder@connectshiksha.com');
    const memberPayouts = payouts.filter(p => p.userId.email !== 'founder@connectshiksha.com');

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
    console.log(`   Expected Founder Total: ₹${expectedFounderTotal.toLocaleString()}`);
    console.log(`   Actual Founder Total: ₹${founderPayout?.totalShares.toLocaleString() || 0}`);
    console.log(`   Expected Per Member: ₹${expectedPerMember.toLocaleString()}`);
    console.log(`   Actual Per Member: ₹${memberPayouts[0]?.totalShares.toLocaleString() || 0}`);
    
    const isCorrect = founderPayout?.totalShares === expectedFounderTotal && 
                     memberPayouts[0]?.totalShares === expectedPerMember;
    
    console.log(`   ✅ Distribution is ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);

    // Clean up test data
    await Project.findByIdAndDelete(testProject._id);
    await Income.findByIdAndDelete(testIncome._id);
    await Expense.findByIdAndDelete(testExpense._id);
    await Payout.deleteMany({});
    console.log(`\n🧹 Cleaned up test data`);

    console.log(`\n✅ Test completed successfully!`);

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    mongoose.connection.close();
  }
};

testNewProfitSharing();
