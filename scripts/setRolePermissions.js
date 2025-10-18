const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import models
const Role = require('../models/Role');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const setRolePermissions = async () => {
  try {
    // Define role permissions
    const rolePermissions = {
      'FOUNDER': {
        users: { create: true, read: true, update: true, delete: true },
        teams: { create: true, read: true, update: true, delete: true },
        projects: { create: true, read: true, update: true, delete: true },
        tasks: { create: true, read: true, update: true, delete: true },
        finance: { create: true, read: true, update: true, delete: true },
        payroll: { create: true, read: true, update: true, delete: true },
        clients: { create: true, read: true, update: true, delete: true },
        reports: { create: true, read: true, update: true, delete: true }
      },
      'INNOVATION_LEAD': {
        users: { create: false, read: true, update: false, delete: false },
        teams: { create: true, read: true, update: true, delete: false },
        projects: { create: true, read: true, update: true, delete: false },
        tasks: { create: true, read: true, update: true, delete: false },
        finance: { create: true, read: true, update: true, delete: false },
        payroll: { create: false, read: true, update: false, delete: false },
        clients: { create: true, read: true, update: true, delete: false },
        reports: { create: true, read: true, update: true, delete: false }
      },
      'COACHING_MANAGER': {
        users: { create: false, read: true, update: false, delete: false },
        teams: { create: false, read: true, update: true, delete: false },
        projects: { create: true, read: true, update: true, delete: false },
        tasks: { create: true, read: true, update: true, delete: false },
        finance: { create: false, read: true, update: false, delete: false },
        payroll: { create: false, read: true, update: false, delete: false },
        clients: { create: true, read: true, update: true, delete: false },
        reports: { create: false, read: true, update: false, delete: false }
      },
      'MEDIA_MANAGER': {
        users: { create: false, read: true, update: false, delete: false },
        teams: { create: false, read: true, update: false, delete: false },
        projects: { create: false, read: true, update: false, delete: false },
        tasks: { create: false, read: true, update: false, delete: false },
        finance: { create: false, read: true, update: false, delete: false },
        payroll: { create: false, read: true, update: false, delete: false },
        clients: { create: false, read: true, update: false, delete: false },
        reports: { create: true, read: true, update: true, delete: false }
      },
      'MENTOR': {
        users: { create: false, read: true, update: false, delete: false },
        teams: { create: false, read: true, update: false, delete: false },
        projects: { create: false, read: true, update: false, delete: false },
        tasks: { create: true, read: true, update: true, delete: false },
        finance: { create: false, read: false, update: false, delete: false },
        payroll: { create: false, read: false, update: false, delete: false },
        clients: { create: false, read: true, update: false, delete: false },
        reports: { create: false, read: true, update: false, delete: false }
      }
    };

    // Update each role
    for (const [roleKey, permissions] of Object.entries(rolePermissions)) {
      await Role.findOneAndUpdate(
        { key: roleKey },
        { permissions },
        { new: true }
      );
      console.log(`✅ Updated permissions for ${roleKey}`);
    }

    console.log('\n🎉 All role permissions updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating permissions:', err);
    process.exit(1);
  }
};

setRolePermissions();
