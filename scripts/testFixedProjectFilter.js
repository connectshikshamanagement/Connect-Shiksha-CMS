const mongoose = require('mongoose');
const Project = require('../models/Project');
const Team = require('../models/Team');
const User = require('../models/User');

async function testFixedProjectFilter() {
  try {
    console.log('🧪 Testing Fixed Project Team Filter');
    console.log('════════════════════════════════════════════════════════════');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-shiksha-crm');
    console.log('✅ MongoDB Connected');

    // Get all projects with populated team data
    const projects = await Project.find()
      .populate('teamId', 'name')
      .populate('ownerId', 'name email')
      .populate('projectMembers', 'name email');

    // Get all teams
    const teams = await Team.find();

    console.log(`\n📊 Found ${projects.length} projects and ${teams.length} teams`);

    // Test the fixed filtering logic
    console.log(`\n🔍 Testing fixed filtering logic:`);
    
    teams.forEach(team => {
      console.log(`\n📋 Team: ${team.name} (${team._id})`);
      
      // This is the fixed filtering logic from the frontend
      const filteredProjects = projects.filter((project) => {
        const projectTeamId = project.teamId?._id || project.teamId;
        return projectTeamId?.toString() === team._id.toString();
      });
      
      console.log(`   Associated projects: ${filteredProjects.length}`);
      filteredProjects.forEach(project => {
        console.log(`     - ${project.title}`);
        console.log(`       Team ID: ${project.teamId?._id || project.teamId}`);
        console.log(`       Team Name: ${project.teamId?.name || 'N/A'}`);
        console.log(`       Project Members: ${project.projectMembers?.length || 0}`);
      });
    });

    console.log('\n✅ Fixed project team filter test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected');
  }
}

testFixedProjectFilter();
