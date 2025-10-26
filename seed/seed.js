const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import models
const User = require('../models/User');
const Role = require('../models/Role');
const Product = require('../models/Product');
const Team = require('../models/Team');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const seedData = async () => {
  try {
    // ---- ROLES ----
    if (await Role.countDocuments() === 0) {
      // Founder - 100% access
      const founderPermissions = {
        users: { create: true, read: true, update: true, delete: true },
        teams: { create: true, read: true, update: true, delete: true },
        projects: { create: true, read: true, update: true, delete: true },
        tasks: { create: true, read: true, update: true, delete: true },
        finance: { create: true, read: true, update: true, delete: true },
        payroll: { create: true, read: true, update: true, delete: true },
        clients: { create: true, read: true, update: true, delete: true },
        reports: { create: true, read: true, update: true, delete: true }
      };

      // Team Manager - 70% access (team management)
      const teamManagerPermissions = {
        users: { create: false, read: true, update: false, delete: false },
        teams: { create: true, read: true, update: true, delete: true },
        projects: { create: true, read: true, update: true, delete: true },
        tasks: { create: true, read: true, update: true, delete: true },
        finance: { create: true, read: true, update: true, delete: false },
        payroll: { create: false, read: true, update: false, delete: false },
        clients: { create: true, read: true, update: true, delete: true },
        reports: { create: false, read: true, update: false, delete: false }
      };

      // Team Member - Basic access
      const teamMemberPermissions = {
        users: { create: false, read: true, update: false, delete: false },
        teams: { create: false, read: true, update: false, delete: false },
        projects: { create: false, read: true, update: false, delete: false },
        tasks: { create: true, read: true, update: true, delete: false },
        finance: { create: true, read: true, update: false, delete: false },
        payroll: { create: false, read: true, update: false, delete: false },
        clients: { create: false, read: true, update: false, delete: false },
        reports: { create: false, read: true, update: false, delete: false }
      };

      await Role.insertMany([
        { key: 'FOUNDER', name: 'Founder', permissions: founderPermissions },
        { key: 'TEAM_MANAGER', name: 'Team Manager', permissions: teamManagerPermissions },
        { key: 'TEAM_MEMBER', name: 'Team Member', permissions: teamMemberPermissions },
      ]);
      console.log('✅ Roles seeded');
    } else {
      console.log('ℹ️ Roles already exist, skipping');
    }

    // ---- USERS ----
    if (await User.countDocuments() === 0) {
      const founderRole = await Role.findOne({ key: 'FOUNDER' });
      const teamManagerRole = await Role.findOne({ key: 'TEAM_MANAGER' });
      const teamMemberRole = await Role.findOne({ key: 'TEAM_MEMBER' });

      await User.create({
        name: 'Founder',
        email: 'founder@connectshiksha.com',
        phone: '9876543210',
        passwordHash: 'founder123', // will be hashed by pre-save middleware
        roleIds: [founderRole._id],
        salary: 100000,
        active: true,
      });

      await User.create({
        name: 'Team Manager',
        email: 'manager@connectshiksha.com',
        phone: '9876543211',
        passwordHash: 'manager123', // will be hashed by pre-save middleware
        roleIds: [teamManagerRole._id],
        salary: 80000,
        active: true,
      });

      await User.create({
        name: 'Team Member',
        email: 'member@connectshiksha.com',
        phone: '9876543212',
        passwordHash: 'member123', // will be hashed by pre-save middleware
        roleIds: [teamMemberRole._id],
        salary: 50000,
        active: true,
      });

      console.log('✅ Users seeded');
      console.log('👉 Login credentials:');
      console.log('   - Founder: founder@connectshiksha.com / founder123');
      console.log('   - Manager: manager@connectshiksha.com / manager123');
      console.log('   - Member: member@connectshiksha.com / member123');
    } else {
      console.log('ℹ️ Users already exist, skipping');
    }

    // ---- PRODUCTS ----
    if (await Product.countDocuments() === 0) {
      await Product.insertMany([
        {
          name: 'IoT Kit',
          sku: 'IOT-001',
          category: 'IoT Kits',
          costPrice: 1500,
          sellPrice: 2500,
          stock: 50,
        },
        {
          name: 'Drone Kit',
          sku: 'DR-001',
          category: 'Drones',
          costPrice: 3000,
          sellPrice: 4500,
          stock: 20,
        },
        {
          name: 'Robotics Starter Kit',
          sku: 'RB-001',
          category: 'Robotics Kits',
          costPrice: 2000,
          sellPrice: 3200,
          stock: 35,
        },
      ]);
      console.log('✅ Products seeded');
    } else {
      console.log('ℹ️ Products already exist, skipping');
    }

    // ---- TEAMS WITH BUDGETS ----
    if (await Team.countDocuments() === 0) {
      const founder = await User.findOne({ email: 'founder@connectshiksha.com' });
      
      await Team.insertMany([
        {
          name: 'Coaching Center Team',
          description: 'Responsible for coaching and training activities',
          leadUserId: founder._id,
          category: 'Coaching Center',
          monthlyBudget: 50000,
          creditLimit: 10000,
          members: [founder._id],
          active: true,
        },
        {
          name: 'Innovation Team',
          description: 'Handles innovation projects and R&D',
          leadUserId: founder._id,
          category: 'Funding & Innovation',
          monthlyBudget: 75000,
          creditLimit: 15000,
          members: [founder._id],
          active: true,
        },
        {
          name: 'Media & Content Team',
          description: 'Creates and manages media content',
          leadUserId: founder._id,
          category: 'Media & Content',
          monthlyBudget: 30000,
          creditLimit: 5000,
          members: [founder._id],
          active: true,
        },
      ]);
      console.log('✅ Teams with budgets seeded');
    } else {
      console.log('ℹ️ Teams already exist, skipping');
    }

    console.log('\n🎉 Safe seed done!');
    console.log('\n👉 Login credentials:');
    console.log('   - Founder (100% access): founder@connectshiksha.com / founder123');
    console.log('   - Team Manager (70% access): manager@connectshiksha.com / manager123');
    console.log('   - Team Member (Basic access): member@connectshiksha.com / member123');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
};

seedData();
