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

const fixGuestLectureProjectTotals = async () => {
  try {
    console.log('🔍 Fixing Guest Lecture October project totals...');
    
    const Project = mongoose.model('Project');
    const Income = mongoose.model('Income');
    const Expense = mongoose.model('Expense');
    const Payroll = mongoose.model('Payroll');
    
    // Find both projects
    const agricultureProject = await Project.findOne({ title: 'Agriculture Drone' });
    const guestLectureProject = await Project.findOne({ title: 'Guest Lecture October' });
    
    if (!agricultureProject || !guestLectureProject) {
      console.log('❌ One or both projects not found');
      return;
    }
    
    console.log(`\n📋 Projects found:`);
    console.log(`   1. ${agricultureProject.title} (ID: ${agricultureProject._id})`);
    console.log(`   2. ${guestLectureProject.title} (ID: ${guestLectureProject._id})`);
    
    // Update project totals for both projects
    const projects = [agricultureProject, guestLectureProject];
    
    for (const project of projects) {
      console.log(`\n🔄 Updating totals for: ${project.title}`);
      
      // Get income and expense records for this project
      const projectIncome = await Income.find({ 
        sourceRefId: project._id, 
        sourceRefModel: 'Project' 
      });
      const projectExpenses = await Expense.find({ projectId: project._id });
      
      // Calculate totals
      const totalIncome = projectIncome.reduce((sum, income) => sum + income.amount, 0);
      const totalExpenses = projectExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const profit = totalIncome - totalExpenses;
      
      console.log(`   Income records: ${projectIncome.length} (Total: ₹${totalIncome})`);
      console.log(`   Expense records: ${projectExpenses.length} (Total: ₹${totalExpenses})`);
      console.log(`   Net Profit: ₹${profit}`);
      
      // Update project totals
      project.totalIncome = totalIncome;
      project.totalExpense = totalExpenses;
      await project.save();
      
      console.log(`   ✅ Updated project totals`);
    }
    
    // Clear all existing payroll records
    console.log(`\n🗑️ Clearing all existing payroll records...`);
    await Payroll.deleteMany({});
    console.log(`   ✅ Cleared all payroll records`);
    
    // Recalculate payroll for both projects
    console.log(`\n🔄 Recalculating payroll for both projects...`);
    
    const { computeProjectProfitSharing } = require('../utils/projectProfitSharing');
    
    for (const project of projects) {
      if (project.totalIncome > 0) {
        console.log(`\n💰 Computing profit sharing for: ${project.title}`);
        const result = await computeProjectProfitSharing(project._id);
        console.log(`   ✅ Founder share: ₹${result.founderShare}`);
        console.log(`   ✅ Share per person: ₹${result.sharePerPerson}`);
        console.log(`   ✅ Total profit: ₹${result.profit}`);
      } else {
        console.log(`\n⏭️ Skipping ${project.title} (no income)`);
      }
    }
    
    // Verify final payroll records
    console.log(`\n📊 Final payroll records:`);
    const finalPayrolls = await Payroll.find({}).populate('userId', 'name email').populate('projectId', 'title');
    finalPayrolls.forEach((payroll, index) => {
      console.log(`   ${index + 1}. ${payroll.userId?.name}: ₹${payroll.profitShare} (${payroll.projectId?.title})`);
    });
    
    const totalPayroll = finalPayrolls.reduce((sum, p) => sum + p.profitShare, 0);
    console.log(`   Total Payroll: ₹${totalPayroll}`);
    
    console.log('\n🎉 Guest Lecture October project totals fixed!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing Guest Lecture project totals:', err);
    process.exit(1);
  }
};

fixGuestLectureProjectTotals();
