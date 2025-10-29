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

const { computeProjectProfitSharing } = require('../utils/projectProfitSharing');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const testComputation = async () => {
  try {
    const project = await Project.findOne({ title: 'demo' });
    
    console.log('\n🔄 Computing profit sharing for demo project...\n');
    
    const result = await computeProjectProfitSharing(project._id, 10, 2025);
    
    console.log('\n📊 RESULT:');
    console.log(JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testComputation();

