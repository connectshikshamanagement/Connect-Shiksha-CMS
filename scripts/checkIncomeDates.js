const mongoose = require('mongoose');
require('dotenv').config();

const Income = require('../models/Income');
const Project = require('../models/Project');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const checkIncome = async () => {
  try {
    const project = await Project.findOne({ title: 'demo' });
    
    console.log('\n💰 INCOME RECORDS FOR DEMO PROJECT:\n');
    
    const incomes = await Income.find({
      sourceRefId: project._id,
      sourceRefModel: 'Project'
    }).sort('date');
    
    console.log(`Total Income Records: ${incomes.length}\n`);
    
    let total = 0;
    incomes.forEach(i => {
      console.log(`₹${i.amount.toLocaleString()} on ${i.date.toISOString().split('T')[0]}`);
      total += i.amount;
    });
    
    console.log(`\nTotal: ₹${total.toLocaleString()}`);
    console.log(`\nProject Start: ${project.startDate.toISOString().split('T')[0]}`);
    console.log(`Rohit Joined: 2025-10-27`);
    
    const incomeAfterOct27 = incomes.filter(i => new Date(i.date) >= new Date('2025-10-27'));
    const totalAfterOct27 = incomeAfterOct27.reduce((sum, i) => sum + i.amount, 0);
    
    console.log(`\nIncome after Oct 27: ₹${totalAfterOct27.toLocaleString()}`);
    console.log(`Income before Oct 27: ₹${(total - totalAfterOct27).toLocaleString()}`);
    
    if (totalAfterOct27 === 0) {
      console.log('\n⚠️  Rohit should have ₹0 profit share (no income after his join date)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkIncome();

