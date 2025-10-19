const mongoose = require('mongoose');
const Project = require('../models/Project');
const Team = require('../models/Team');
const User = require('../models/User');

async function testProjectTeamFilter() {
  try {
    console.log('🧪 Testing Project Team Filter');
    console.log('════════════════════════════════════════════════════════════');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-shiksha-crm');
    console.log('✅ MongoDB Connected');

    // Get all projects with populated team data
    const projects = await Project.find()
      .populate('teamId', 'name')
      .populate('ownerId', 'name email')
      .populate('projectMembers', 'name email');

    console.log(`\n📊 Found ${projects.length} projects:`);

    projects.forEach((project, index) => {
      console.log(`\n${index + 1}. ${project.title}`);
      console.log(`   Team ID (raw): ${project.teamId}`);
      console.log(`   Team ID (type): ${typeof project.teamId}`);
      if (project.teamId && typeof project.teamId === 'object') {
        console.log(`   Team Name: ${project.teamId.name}`);
        console.log(`   Team _id: ${project.teamId._id}`);
      }
      console.log(`   Project Members: ${project.projectMembers?.length || 0}`);
      if (project.projectMembers && project.projectMembers.length > 0) {
        project.projectMembers.forEach((member, i) => {
          console.log(`     ${i + 1}. ${member.name || member} (${typeof member})`);
        });
      }
    });

    // Test the filtering logic
    console.log(`\n🔍 Testing filtering logic:`);
    const teams = await Team.find();
    
    teams.forEach(team => {
      console.log(`\n📋 Team: ${team.name} (${team._id})`);
      const filteredProjects = projects.filter(project => {
        const projectTeamId = project.teamId?._id || project.teamId;
        return projectTeamId === team._id.toString();
      });
      console.log(`   Associated projects: ${filteredProjects.length}`);
      filteredProjects.forEach(project => {
        console.log(`     - ${project.title}`);
      });
    });

    console.log('\n✅ Project team filter test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected');
  }
}

testProjectTeamFilter();
