const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Import all models to register schemas
require('../models/User');
require('../models/Project');
require('../models/Payroll');
require('../models/Team');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const checkAllPayrollRecords = async () => {
  try {
    console.log('🔍 Checking ALL payroll records...');
    
    const Payroll = mongoose.model('Payroll');
    
    // Get ALL payroll records without any filtering
    const allPayrolls = await Payroll.find({}).populate('userId', 'name email').populate('projectId', 'title').populate('teamId', 'name');
    console.log(`\n📋 Found ${allPayrolls.length} total payroll records:`);
    
    allPayrolls.forEach((p, index) => {
      console.log(`\n${index + 1}. ${p.userId?.name} (${p.userId?.email})`);
      console.log(`   Project: ${p.projectId?.title || 'N/A'}`);
      console.log(`   Team: ${p.teamId?.name || 'N/A'}`);
      console.log(`   Month: ${p.month}`);
      console.log(`   Year: ${p.year}`);
      console.log(`   Base Salary: ₹${p.baseSalary || 0}`);
      console.log(`   Profit Share: ₹${p.profitShare || 0}`);
      console.log(`   Bonuses: ₹${p.bonuses || 0}`);
      console.log(`   Deductions: ₹${p.deductions || 0}`);
      console.log(`   Net Amount: ₹${p.netAmount || 0}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Created: ${p.createdAt}`);
    });
    
    // Check if Nikhil has any records
    const nikhilRecords = allPayrolls.filter(p => p.userId?.name?.includes('Nikhil'));
    console.log(`\n🔍 Nikhil's records: ${nikhilRecords.length}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking payroll records:', err);
    process.exit(1);
  }
};

checkAllPayrollRecords();
