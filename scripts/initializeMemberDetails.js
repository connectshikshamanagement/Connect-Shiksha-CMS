const mongoose = require('mongoose');
const Project = require('../models/Project');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const initializeMemberDetails = async () => {
  try {
    console.log('🔄 Initializing memberDetails for existing projects...\n');

    const projects = await Project.find({});
    let updatedCount = 0;

    for (const project of projects) {
      let needsUpdate = false;

      // Initialize memberDetails if empty or doesn't exist
      if (!project.memberDetails || project.memberDetails.length === 0) {
        project.memberDetails = [];
        needsUpdate = true;
      }

      // Add all current projectMembers to memberDetails if not already present
      if (project.projectMembers && project.projectMembers.length > 0) {
        for (const memberId of project.projectMembers) {
          const existingDetail = project.memberDetails.find(
            detail => detail.userId.toString() === memberId.toString()
          );

          if (!existingDetail) {
            project.memberDetails.push({
              userId: memberId,
              joinedDate: project.startDate || project.createdAt || new Date(),
              isActive: true,
              leftDate: null
            });
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        await project.save();
        updatedCount++;
        console.log(`✅ Updated project: ${project.title} (${project.memberDetails.length} members)`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total projects: ${projects.length}`);
    console.log(`   Updated projects: ${updatedCount}`);
    console.log('\n🎉 Migration completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing member details:', error);
    process.exit(1);
  }
};

initializeMemberDetails();

