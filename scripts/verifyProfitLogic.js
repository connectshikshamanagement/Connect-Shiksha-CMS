const mongoose = require('mongoose');
require('dotenv').config();

// Load all models
const Project = require('../models/Project');
const User = require('../models/User');
const Team = require('../models/Team');
const Role = require('../models/Role');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Payroll = require('../models/Payroll');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const verifyLogic = async () => {
  try {
    const project = await Project.findOne({ title: 'demo' })
      .populate('ownerId', 'name email')
      .populate('projectMembers', 'name email');
    
    console.log('\n📊 VERIFICATION OF PROFIT SHARING LOGIC\n');
    console.log('Project:', project.title);
    console.log('Total Income: ₹102,000');
    console.log('Total Expenses: ₹52,000');
    console.log('Net Profit: ₹50,000\n');
    
    // Expected values
    const totalProfit = 50000;
    const founderShare = totalProfit * 0.7; // 70%
    const teamShare = totalProfit * 0.3; // 30%
    
    console.log('Expected Distribution:');
    console.log(`  Founder (70%): ₹${founderShare.toLocaleString()}`);
    console.log(`  Team (30%): ₹${teamShare.toLocaleString()}`);
    
    // Check project owner
    console.log(`\nProject Owner: ${project.ownerId?.name || 'N/A'}`);
    
    // Count non-founder members
    const nonFounderMembers = project.projectMembers.filter(
      m => m.email !== 'founder@connectshiksha.com'
    );
    console.log(`Non-Founder Members: ${nonFounderMembers.length}`);
    nonFounderMembers.forEach(m => {
      console.log(`  - ${m.name} (${m.email})`);
      if (m._id.toString() === project.ownerId?._id.toString()) {
        console.log('    👑 PROJECT OWNER');
      }
    });
    
    // Calculate team share distribution
    console.log('\n📐 Team Share Calculation (30% = ₹15,000):');
    
    if (project.ownerId && nonFounderMembers.some(m => m._id.toString() === project.ownerId._id.toString())) {
      console.log('  Project Owner Bonus: 3% of team share');
      const ownerBonus = teamShare * 0.03; // 3% of 30% = 0.9% of total
      const remainingForMembers = teamShare * 0.97; // 97% of 30% = 29.1% of total
      const sharePerPerson = remainingForMembers / nonFounderMembers.length;
      
      console.log(`  Owner Bonus: ₹${Math.round(ownerBonus).toLocaleString()} (3% of ₹${teamShare.toLocaleString()})`);
      console.log(`  Remaining for all: ₹${Math.round(remainingForMembers).toLocaleString()}`);
      console.log(`  Share per person: ₹${Math.round(sharePerPerson).toLocaleString()}`);
      
      nonFounderMembers.forEach(m => {
        const isOwner = m._id.toString() === project.ownerId._id.toString();
        const share = isOwner ? sharePerPerson + ownerBonus : sharePerPerson;
        console.log(`  ${m.name}: ₹${Math.round(share).toLocaleString()} ${isOwner ? '(includes +₹' + Math.round(ownerBonus) + ' bonus)' : ''}`);
      });
    } else {
      const sharePerPerson = teamShare / nonFounderMembers.length;
      console.log(`  Share per person: ₹${Math.round(sharePerPerson).toLocaleString()}`);
      nonFounderMembers.forEach(m => {
        console.log(`  ${m.name}: ₹${Math.round(sharePerPerson).toLocaleString()}`);
      });
    }
    
    // Check actual payroll records
    console.log('\n💵 ACTUAL PAYROLL RECORDS (October 2025):');
    const payrolls = await Payroll.find({
      projectId: project._id,
      month: '2025-10'
    }).populate('userId', 'name email');
    
    payrolls.forEach(p => {
      const isFounder = p.userId.email === 'founder@connectshiksha.com';
      const percentage = ((p.profitShare / totalProfit) * 100).toFixed(2);
      console.log(`  ${p.userId.name}: ₹${Math.round(p.profitShare).toLocaleString()} (${percentage}% of total profit)`);
      if (p.ownerBonus) {
        console.log(`    👑 Owner Bonus: ₹${Math.round(p.ownerBonus).toLocaleString()}`);
      }
    });
    
    console.log('\n✅ Verification Complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

verifyLogic();

