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

const testPayrollAPI = async () => {
  try {
    console.log('🔍 Testing payroll API query...');
    
    const Payroll = mongoose.model('Payroll');
    
    // Test 1: Get all payroll records
    console.log('\n📋 Test 1: All payroll records');
    const allPayrolls = await Payroll.find({}).populate('userId', 'name email').populate('projectId', 'title');
    console.log(`Found ${allPayrolls.length} records:`);
    allPayrolls.forEach(p => {
      console.log(`- ${p.userId?.name}: Project: ${p.projectId?.title || 'N/A'}, Month: ${p.month}, Profit: ₹${p.profitShare || 0}`);
    });
    
    // Test 2: Get records for October 2025
    console.log('\n📋 Test 2: October 2025 records');
    const oct2025Payrolls = await Payroll.find({ month: '2025-10' }).populate('userId', 'name email').populate('projectId', 'title');
    console.log(`Found ${oct2025Payrolls.length} records for 2025-10:`);
    oct2025Payrolls.forEach(p => {
      console.log(`- ${p.userId?.name}: Project: ${p.projectId?.title || 'N/A'}, Month: ${p.month}, Profit: ₹${p.profitShare || 0}`);
    });
    
    // Test 3: Get records for current month
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    console.log(`\n📋 Test 3: Current month records (${currentMonth})`);
    const currentMonthPayrolls = await Payroll.find({ month: currentMonth }).populate('userId', 'name email').populate('projectId', 'title');
    console.log(`Found ${currentMonthPayrolls.length} records for ${currentMonth}:`);
    currentMonthPayrolls.forEach(p => {
      console.log(`- ${p.userId?.name}: Project: ${p.projectId?.title || 'N/A'}, Month: ${p.month}, Profit: ₹${p.profitShare || 0}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error testing payroll API:', err);
    process.exit(1);
  }
};

testPayrollAPI();
