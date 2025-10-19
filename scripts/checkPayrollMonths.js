const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Import all models to register schemas
require('../models/User');
require('../models/Project');
require('../models/Payroll');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const checkPayrollMonths = async () => {
  try {
    console.log('🔍 Checking payroll record month formats...');
    
    const Payroll = mongoose.model('Payroll');
    const payrolls = await Payroll.find({}).populate('userId', 'name email').populate('projectId', 'title');
    console.log('\n💰 Payroll Records:');
    payrolls.forEach(p => {
      console.log(`- ${p.userId?.name}: Project: ${p.projectId?.title || 'N/A'}, Month: ${p.month}, Year: ${p.year}, Profit: ₹${p.profitShare || 0}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking payroll months:', err);
    process.exit(1);
  }
};

checkPayrollMonths();
