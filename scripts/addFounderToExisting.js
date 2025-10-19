const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import models
const User = require('../models/User');
const Role = require('../models/Role');
const Team = require('../models/Team');
const Project = require('../models/Project');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const addFounderToExisting = async () => {
  try {
    console.log('🔄 Adding founder to all existing teams and projects...');

    // Find the founder
    const founderRole = await Role.findOne({ key: 'FOUNDER' });
    if (!founderRole) {
      console.log('❌ FOUNDER role not found');
      return;
    }

    const founder = await User.findOne({ 
      roleIds: { $in: [founderRole._id] },
      active: true 
    });

    if (!founder) {
      console.log('❌ No active founder found');
      return;
    }

    console.log(`👑 Found founder: ${founder.name} (${founder.email})`);

    // Add founder to all existing teams
    const teams = await Team.find({});
    let teamsUpdated = 0;

    for (const team of teams) {
      if (!team.members.includes(founder._id)) {
        team.members.push(founder._id);
        await team.save();
        teamsUpdated++;
        console.log(`✅ Added founder to team: ${team.name}`);
      }
    }

    console.log(`📊 Updated ${teamsUpdated} teams`);

    // Add founder to all existing projects
    const projects = await Project.find({});
    let projectsUpdated = 0;

    for (const project of projects) {
      if (!project.projectMembers.includes(founder._id)) {
        project.projectMembers.push(founder._id);
        await project.save();
        projectsUpdated++;
        console.log(`✅ Added founder to project: ${project.title}`);
      }
    }

    console.log(`📊 Updated ${projectsUpdated} projects`);

    console.log('\n🎉 Successfully added founder to all existing teams and projects!');
    console.log(`📋 Summary:`);
    console.log(`  - Teams updated: ${teamsUpdated}`);
    console.log(`  - Projects updated: ${projectsUpdated}`);
    console.log(`  - Founder: ${founder.name}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error adding founder to existing records:', err);
    process.exit(1);
  }
};

addFounderToExisting();
