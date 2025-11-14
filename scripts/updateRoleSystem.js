const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import models
const Role = require('../models/Role');
const User = require('../models/User');
const Project = require('../models/Project');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const updateRoleSystem = async () => {
  try {
    console.log('🔄 Updating role system to 3-role structure...');

    // Define the 3 new roles with proper permissions
    const newRoles = [
      {
        key: 'FOUNDER',
        name: 'Founder',
        description: 'Full system access and 70% project profit',
        permissions: {
          users: { create: true, read: true, update: true, delete: true },
          teams: { create: true, read: true, update: true, delete: true },
          projects: { create: true, read: true, update: true, delete: true },
          tasks: { create: true, read: true, update: true, delete: true },
          finance: { create: true, read: true, update: true, delete: true },
          payroll: { create: true, read: true, update: true, delete: true },
          clients: { create: true, read: true, update: true, delete: true },
          reports: { create: true, read: true, update: true, delete: true }
        }
      },
      {
        key: 'PROJECT_MANAGER',
        name: 'Project Manager',
        description: 'Manages assigned projects and receives equal share of 30% profit if part of project',
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          teams: { create: true, read: true, update: true, delete: true },
          projects: { create: true, read: true, update: true, delete: true },
          tasks: { create: true, read: true, update: true, delete: true },
          finance: { create: false, read: false, update: false, delete: false }, // Hide finance, products, and sales
          payroll: { create: false, read: true, update: false, delete: false }, // Show payroll
          clients: { create: true, read: true, update: true, delete: false },
          reports: { create: false, read: true, update: false, delete: false }
        }
      },
      {
        key: 'TEAM_MEMBER',
        name: 'Team Member',
        description: 'Assigned to projects and eligible for profit if part of the project',
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          teams: { create: false, read: true, update: false, delete: false },
          projects: { create: false, read: true, update: false, delete: false },
          tasks: { create: false, read: true, update: true, delete: false },
          finance: { create: false, read: false, update: false, delete: false },
          payroll: { create: false, read: true, update: false, delete: false },
          clients: { create: false, read: true, update: false, delete: false },
          reports: { create: false, read: true, update: false, delete: false }
        }
      }
    ];

    // Clear existing roles and insert new ones
    await Role.deleteMany({});
    console.log('🗑️ Cleared existing roles');

    const createdRoles = await Role.insertMany(newRoles);
    console.log('✅ Created new role system:', createdRoles.map(r => r.key).join(', '));

    // Update existing users to have appropriate roles
    const founderRole = await Role.findOne({ key: 'FOUNDER' });
    const managerRole = await Role.findOne({ key: 'PROJECT_MANAGER' });
    const memberRole = await Role.findOne({ key: 'TEAM_MEMBER' });

    // Find the founder user (assuming it exists)
    const founder = await User.findOne({ email: 'founder@connectshiksha.com' });
    if (founder) {
      founder.roleIds = [founderRole._id];
      await founder.save();
      console.log('👑 Updated founder role');
    }

    // Update other users to have team member role by default
    await User.updateMany(
      { email: { $ne: 'founder@connectshiksha.com' } },
      { roleIds: [memberRole._id] }
    );
    console.log('👥 Updated other users to team member role');

    console.log('\n🎉 Role system updated successfully!');
    console.log('📋 New roles:');
    console.log('  - FOUNDER: Full system access + 70% profit');
    console.log('  - PROJECT_MANAGER: Project management + equal share of 30% profit');
    console.log('  - TEAM_MEMBER: Project assignment + eligible for profit if part of project');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating role system:', err);
    process.exit(1);
  }
};

updateRoleSystem();
