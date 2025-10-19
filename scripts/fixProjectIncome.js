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

const fixProjectIncome = async () => {
  try {
    console.log('🔍 Fixing project income links...');
    
    const Income = mongoose.model('Income');
    const Project = mongoose.model('Project');
    
    // Find the tetsaetset project
    const project = await Project.findOne({ title: 'tetsaetset' });
    if (!project) {
      console.log('❌ Project "tetsaetset" not found');
      return;
    }
    
    console.log(`📋 Found project: ${project.title} (ID: ${project._id})`);
    
    // Find the ₹30,000 Coaching income record
    const coachingIncome = await Income.findOne({ 
      sourceType: 'Coaching', 
      amount: 30000,
      projectId: null 
    });
    
    if (!coachingIncome) {
      console.log('❌ ₹30,000 Coaching income record not found');
      return;
    }
    
    console.log(`💵 Found Coaching income: ₹${coachingIncome.amount} (ID: ${coachingIncome._id})`);
    
    // Link the income record to the project
    coachingIncome.projectId = project._id;
    await coachingIncome.save();
    
    console.log('✅ Linked Coaching income to tetsaetset project');
    
    // Update project total income
    project.totalIncome = coachingIncome.amount;
    await project.save();
    
    console.log('✅ Updated project total income');
    
    // Recalculate profit sharing for this project
    console.log('\n🔄 Recalculating profit sharing...');
    
    const { computeProjectProfitSharing } = require('../utils/projectProfitSharing');
    const result = await computeProjectProfitSharing(project._id);
    
    console.log('✅ Profit sharing recalculated:');
    console.log(`   Founder share: ₹${result.founderShare}`);
    console.log(`   Share per person: ₹${result.sharePerPerson}`);
    console.log(`   Total profit: ₹${result.profit}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing project income:', err);
    process.exit(1);
  }
};

fixProjectIncome();
