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
      await Role.insertMany([
        { key: 'FOUNDER', name: 'Founder' },
        { key: 'INNOVATION_LEAD', name: 'Innovation Lead' },
        { key: 'COACHING_MANAGER', name: 'Coaching Manager' },
        { key: 'MEDIA_MANAGER', name: 'Media Manager' },
        { key: 'MENTOR', name: 'Mentor' },
      ]);
      console.log('✅ Roles seeded');
    } else {
      console.log('ℹ️ Roles already exist, skipping');
    }

    // ---- USERS ----
    if (await User.countDocuments() === 0) {
      const founderRole = await Role.findOne({ key: 'FOUNDER' });
      const innovationRole = await Role.findOne({ key: 'INNOVATION_LEAD' });
      const coachingRole = await Role.findOne({ key: 'COACHING_MANAGER' });
      const mediaRole = await Role.findOne({ key: 'MEDIA_MANAGER' });
      const mentorRole = await Role.findOne({ key: 'MENTOR' });

      await User.create({
        name: 'Founder',
        email: 'founder@connectshiksha.com',
        phone: '9876543210',
        passwordHash: 'founder123', // will be hashed by pre-save middleware
        roleIds: [founderRole._id],
        salary: 100000,
        active: true,
      });
     
    

      console.log('✅ Users seeded');
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
    console.log('👉 Login with founder@connectshiksha.com / founder123');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
};

seedData();
