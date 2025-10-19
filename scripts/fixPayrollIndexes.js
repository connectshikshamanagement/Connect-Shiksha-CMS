const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Import all models to register schemas
require('../models/User');
require('../models/Project');
require('../models/Payroll');
require('../models/Team');
require('../models/Role');
require('../models/Income');
require('../models/Expense');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const fixPayrollIndexes = async () => {
  try {
    console.log('🔍 Fixing payroll indexes...');
    
    const Payroll = mongoose.model('Payroll');
    
    // Drop the old unique index
    try {
      await Payroll.collection.dropIndex({ userId: 1, month: 1 });
      console.log('✅ Dropped old unique index');
    } catch (error) {
      console.log('⚠️ Old index not found or already dropped');
    }
    
    // Create the new unique index with projectId
    try {
      await Payroll.collection.createIndex(
        { userId: 1, projectId: 1, month: 1 }, 
        { unique: true, name: 'userId_projectId_month_unique' }
      );
      console.log('✅ Created new unique index with projectId');
    } catch (error) {
      console.log('⚠️ New index already exists or error creating:', error.message);
    }
    
    // Create additional indexes
    try {
      await Payroll.collection.createIndex({ projectId: 1, month: 1 });
      console.log('✅ Created project-based index');
    } catch (error) {
      console.log('⚠️ Project index already exists');
    }
    
    console.log('\n🎉 Payroll indexes fixed!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing payroll indexes:', err);
    process.exit(1);
  }
};

fixPayrollIndexes();
