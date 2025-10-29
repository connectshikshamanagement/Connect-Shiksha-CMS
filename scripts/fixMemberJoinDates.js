const mongoose = require('mongoose');
const Project = require('../models/Project');
const Payroll = require('../models/Payroll');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const fixMemberJoinDates = async () => {
  try {
    console.log('🔄 Fixing member join dates...\n');

    const projects = await Project.find({});
    let fixedCount = 0;

    for (const project of projects) {
      let needsUpdate = false;

      // Check each member detail
      for (const detail of project.memberDetails) {
        // If join date equals project start date, it might be wrong for recently added members
        // We'll check if they have payroll records to verify
        if (detail.joinedDate && project.startDate) {
          const joinDate = new Date(detail.joinedDate);
          const startDate = new Date(project.startDate);
          
          // If dates are the same (within 1 day), check payroll records
          const timeDiff = Math.abs(joinDate - startDate);
          const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
          
          if (daysDiff < 1) {
            // Check if this user has recent payroll records that might indicate actual join date
            const payrollRecords = await Payroll.find({
              userId: detail.userId,
              projectId: project._id
            }).sort('createdAt');
            
            if (payrollRecords.length > 0) {
              const firstPayroll = payrollRecords[0];
              const payrollDate = new Date(firstPayroll.createdAt);
              
              // If first payroll was created more than 7 days after project start,
              // use that as the likely join date
              const daysAfterStart = (payrollDate - startDate) / (1000 * 60 * 60 * 24);
              
              if (daysAfterStart > 7) {
                console.log(`📝 User ${detail.userId} in project "${project.title}":`);
                console.log(`   Project started: ${startDate.toLocaleDateString()}`);
                console.log(`   Current join date: ${joinDate.toLocaleDateString()}`);
                console.log(`   First payroll: ${payrollDate.toLocaleDateString()}`);
                console.log(`   → Updating join date to: ${payrollDate.toLocaleDateString()}`);
                
                detail.joinedDate = payrollDate;
                needsUpdate = true;
              }
            }
          }
        }
      }

      if (needsUpdate) {
        await project.save();
        fixedCount++;
        console.log(`✅ Updated project: ${project.title}\n`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total projects checked: ${projects.length}`);
    console.log(`   Projects with fixes: ${fixedCount}`);
    console.log('\n💡 Tip: From now on, new members will automatically get the current date as join date!');
    console.log('\n🎉 Fix completed!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing member join dates:', error);
    process.exit(1);
  }
};

fixMemberJoinDates();

