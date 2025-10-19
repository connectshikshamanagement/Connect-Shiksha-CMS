const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Import all models to register schemas
require('../models/User');
require('../models/Project');
require('../models/Payroll');
require('../models/Team');
require('../models/Role');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const checkUserRoles = async () => {
  try {
    console.log('🔍 Checking user roles and payroll access...');
    
    const User = mongoose.model('User');
    const Payroll = mongoose.model('Payroll');
    
    // Get all users with their roles
    const users = await User.find({}).populate('roleIds');
    console.log('\n👥 All Users and Roles:');
    
    users.forEach(user => {
      const roles = user.roleIds.map(r => r.key).join(', ');
      console.log(`\n- ${user.name} (${user.email})`);
      console.log(`  Roles: [${roles}]`);
      console.log(`  Active: ${user.active}`);
      
      // Check if this user has payroll records
      Payroll.find({ userId: user._id }).then(payrolls => {
        if (payrolls.length > 0) {
          console.log(`  Payroll Records: ${payrolls.length}`);
          payrolls.forEach(p => {
            console.log(`    - Month: ${p.month}, Profit: ₹${p.profitShare || 0}, Status: ${p.status}`);
          });
        } else {
          console.log(`  Payroll Records: 0`);
        }
      });
    });
    
    // Check who should be the founder
    const founderRole = await mongoose.model('Role').findOne({ key: 'FOUNDER' });
    if (founderRole) {
      console.log(`\n👑 Founder Role ID: ${founderRole._id}`);
      
      const founders = await User.find({ roleIds: { $in: [founderRole._id] } });
      console.log(`Founders: ${founders.length}`);
      founders.forEach(f => {
        console.log(`- ${f.name} (${f.email})`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking user roles:', err);
    process.exit(1);
  }
};

checkUserRoles();
