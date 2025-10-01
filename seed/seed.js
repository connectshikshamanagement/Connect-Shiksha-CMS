const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load env vars
dotenv.config();

// Import models
const User = require('../models/User');
const Role = require('../models/Role');
const Team = require('../models/Team');
const Project = require('../models/Project');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const ProfitSharingRule = require('../models/ProfitSharingRule');
const Client = require('../models/Client');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Seed data
const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Role.deleteMany({});
    await Team.deleteMany({});
    await Project.deleteMany({});
    await Income.deleteMany({});
    await Expense.deleteMany({});
    await Product.deleteMany({});
    await ProfitSharingRule.deleteMany({});
    await Client.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Create Roles
    const roles = await Role.insertMany([
      {
        key: 'FOUNDER',
        name: 'Founder',
        description: 'Full access to all system features',
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
        key: 'INNOVATION_LEAD',
        name: 'Innovation Lead',
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          teams: { create: true, read: true, update: true, delete: false },
          projects: { create: true, read: true, update: true, delete: false },
          tasks: { create: true, read: true, update: true, delete: false },
          finance: { create: false, read: true, update: false, delete: false },
          payroll: { create: false, read: false, update: false, delete: false },
          clients: { create: true, read: true, update: true, delete: false },
          reports: { create: false, read: true, update: false, delete: false }
        }
      },
      {
        key: 'COACHING_MANAGER',
        name: 'Coaching Manager',
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          teams: { create: false, read: true, update: true, delete: false },
          projects: { create: true, read: true, update: true, delete: false },
          tasks: { create: true, read: true, update: true, delete: false },
          finance: { create: true, read: true, update: false, delete: false },
          payroll: { create: false, read: false, update: false, delete: false },
          clients: { create: true, read: true, update: true, delete: false },
          reports: { create: false, read: true, update: false, delete: false }
        }
      },
      {
        key: 'MEDIA_MANAGER',
        name: 'Media Manager',
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          teams: { create: false, read: true, update: true, delete: false },
          projects: { create: true, read: true, update: true, delete: false },
          tasks: { create: true, read: true, update: true, delete: false },
          finance: { create: false, read: true, update: false, delete: false },
          payroll: { create: false, read: false, update: false, delete: false },
          clients: { create: true, read: true, update: true, delete: false },
          reports: { create: false, read: true, update: false, delete: false }
        }
      },
      {
        key: 'MENTOR',
        name: 'Mentor',
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          teams: { create: false, read: true, update: false, delete: false },
          projects: { create: false, read: true, update: false, delete: false },
          tasks: { create: true, read: true, update: true, delete: false },
          finance: { create: false, read: false, update: false, delete: false },
          payroll: { create: false, read: false, update: false, delete: false },
          clients: { create: false, read: true, update: false, delete: false },
          reports: { create: false, read: false, update: false, delete: false }
        }
      }
    ]);

    console.log('✅ Created roles');

    // Create Users (using create to trigger password hashing middleware)
    const users = [];
    
    const userData = [
      {
        name: 'Founder',
        email: 'founder@connectshiksha.com',
        phone: '9876543210',
        passwordHash: 'founder123',
        roleIds: [roles[0]._id],
        salary: 100000,
        active: true
      },
      {
        name: 'Innovation Lead',
        email: 'innovation@connectshiksha.com',
        phone: '9876543211',
        passwordHash: 'innovation123',
        roleIds: [roles[1]._id],
        salary: 60000,
        active: true
      },
      {
        name: 'Coaching Manager',
        email: 'coaching@connectshiksha.com',
        phone: '9876543212',
        passwordHash: 'coaching123',
        roleIds: [roles[2]._id],
        salary: 50000,
        active: true
      },
      {
        name: 'Media Manager',
        email: 'media@connectshiksha.com',
        phone: '9876543213',
        passwordHash: 'media123',
        roleIds: [roles[3]._id],
        salary: 45000,
        active: true
      },
      {
        name: 'Mentor 1',
        email: 'mentor1@connectshiksha.com',
        phone: '9876543214',
        passwordHash: 'mentor123',
        roleIds: [roles[4]._id],
        salary: 30000,
        active: true
      },
      {
        name: 'Mentor 2',
        email: 'mentor2@connectshiksha.com',
        phone: '9876543215',
        passwordHash: 'mentor123',
        roleIds: [roles[4]._id],
        salary: 30000,
        active: true
      }
    ];
    
    // Create users one by one to trigger pre-save hook for password hashing
    for (const data of userData) {
      const user = await User.create(data);
      users.push(user);
    }

    console.log('✅ Created users');

    // Create Teams
    const teams = await Team.insertMany([
      {
        name: 'Funding & Innovation',
        description: 'Handles funding, innovation projects, and new initiatives',
        leadUserId: users[1]._id,
        members: [users[1]._id],
        category: 'Funding & Innovation',
        active: true
      },
      {
        name: 'Coaching Center',
        description: 'Manages coaching batches and student programs',
        leadUserId: users[2]._id,
        members: [users[2]._id, users[4]._id, users[5]._id],
        category: 'Coaching Center',
        active: true
      },
      {
        name: 'Media & Content',
        description: 'Handles media production and content creation',
        leadUserId: users[3]._id,
        members: [users[3]._id],
        category: 'Media & Content',
        active: true
      }
    ]);

    console.log('✅ Created teams');

    // Create Projects
    const projects = await Project.insertMany([
      {
        title: 'JEE/NEET Coaching Batch - Oct 2025',
        description: 'Coaching batch for JEE and NEET aspirants',
        category: 'Coaching',
        status: 'active',
        teamId: teams[1]._id,
        ownerId: users[2]._id,
        budget: 500000,
        priority: 'high',
        progress: 40
      },
      {
        title: 'Robotics Workshop - Schools',
        description: 'Robotics workshop for school students',
        category: 'Workshops',
        status: 'active',
        teamId: teams[0]._id,
        ownerId: users[1]._id,
        budget: 300000,
        priority: 'high',
        progress: 60
      },
      {
        title: 'Social Media Campaign',
        description: 'Digital marketing campaign for brand awareness',
        category: 'Media',
        status: 'active',
        teamId: teams[2]._id,
        ownerId: users[3]._id,
        budget: 50000,
        priority: 'medium',
        progress: 30
      }
    ]);

    console.log('✅ Created projects');

    // Create Products
    const products = await Product.insertMany([
      {
        name: 'IoT Development Kit',
        sku: 'IOT-KIT-001',
        description: 'Complete IoT development kit for students',
        category: 'IoT Kits',
        costPrice: 1500,
        sellPrice: 2500,
        stock: 50
      },
      {
        name: 'Drone Kit',
        sku: 'DRONE-001',
        description: 'Educational drone building kit',
        category: 'Drones',
        costPrice: 3000,
        sellPrice: 4500,
        stock: 20
      },
      {
        name: 'Robotics Starter Kit',
        sku: 'ROBOT-KIT-001',
        description: 'Beginner robotics kit with sensors',
        category: 'Robotics Kits',
        costPrice: 2000,
        sellPrice: 3200,
        stock: 35
      }
    ]);

    console.log('✅ Created products');

    // Create Clients
    const clients = await Client.insertMany([
      {
        name: 'ABC School',
        type: 'School',
        status: 'won',
        contact: {
          primaryName: 'Principal Kumar',
          designation: 'Principal',
          email: 'principal@abcschool.com',
          phone: '9999888877',
          address: {
            street: 'MG Road',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560001',
            country: 'India'
          }
        },
        ownerId: users[1]._id,
        totalRevenue: 150000,
        followUps: []
      },
      {
        name: 'XYZ College',
        type: 'College',
        status: 'proposal_sent',
        contact: {
          primaryName: 'Dr. Sharma',
          designation: 'Dean',
          email: 'dean@xyzcollege.com',
          phone: '9999777766',
          address: {
            street: 'College Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            country: 'India'
          }
        },
        ownerId: users[1]._id,
        expectedRevenue: 300000,
        followUps: []
      }
    ]);

    console.log('✅ Created clients');

    // Create Income records
    await Income.insertMany([
      {
        sourceType: 'Coaching',
        amount: 50000,
        date: new Date('2025-09-15'),
        receivedByUserId: users[2]._id,
        description: 'Coaching batch fees - September',
        paymentMethod: 'bank_transfer',
        clientId: clients[0]._id
      },
      {
        sourceType: 'Paid Workshops',
        amount: 150000,
        date: new Date('2025-09-20'),
        receivedByUserId: users[1]._id,
        description: 'Robotics workshop payment',
        paymentMethod: 'bank_transfer',
        clientId: clients[0]._id
      },
      {
        sourceType: 'Product Sales',
        amount: 25000,
        date: new Date('2025-09-25'),
        receivedByUserId: users[0]._id,
        description: 'IoT kits sale - 10 units',
        paymentMethod: 'upi'
      }
    ]);

    console.log('✅ Created income records');

    // Create Expense records
    await Expense.insertMany([
      {
        category: 'Rent',
        amount: 30000,
        date: new Date('2025-09-01'),
        description: 'Office rent - September',
        paymentMethod: 'bank_transfer',
        submittedBy: users[0]._id,
        approvedBy: users[0]._id,
        status: 'approved'
      },
      {
        category: 'Salaries',
        amount: 315000,
        date: new Date('2025-09-30'),
        description: 'Team salaries - September',
        paymentMethod: 'bank_transfer',
        submittedBy: users[0]._id,
        approvedBy: users[0]._id,
        status: 'approved'
      },
      {
        category: 'Marketing',
        amount: 15000,
        date: new Date('2025-09-10'),
        description: 'Social media ads',
        paymentMethod: 'card',
        submittedBy: users[3]._id,
        approvedBy: users[0]._id,
        status: 'approved'
      },
      {
        category: 'Manufacturing',
        amount: 40000,
        date: new Date('2025-09-15'),
        description: 'IoT kit components',
        paymentMethod: 'bank_transfer',
        submittedBy: users[1]._id,
        approvedBy: users[0]._id,
        status: 'approved'
      }
    ]);

    console.log('✅ Created expense records');

    // Create Profit Sharing Rules
    await ProfitSharingRule.insertMany([
      {
        appliesTo: 'Coaching',
        description: '70% retained, 30% to instructors',
        distribution: [
          { recipientType: 'pool', recipientId: 'COMPANY', percentage: 70, description: 'Company retention' },
          { recipientType: 'role', recipientId: 'MENTOR', percentage: 30, description: 'Mentors/Instructors' }
        ],
        active: true
      },
      {
        appliesTo: 'Paid Workshops',
        description: '60% retained, 30% shared, 10% lead gen team',
        distribution: [
          { recipientType: 'pool', recipientId: 'COMPANY', percentage: 60, description: 'Company retention' },
          { recipientType: 'role', recipientId: 'INNOVATION_LEAD', percentage: 30, description: 'Workshop team' },
          { recipientType: 'role', recipientId: 'INNOVATION_LEAD', percentage: 10, description: 'Lead generation bonus' }
        ],
        active: true
      },
      {
        appliesTo: 'Guest Lectures',
        description: '70% retained, 30% to speaker',
        distribution: [
          { recipientType: 'pool', recipientId: 'COMPANY', percentage: 70, description: 'Company retention' },
          { recipientType: 'role', recipientId: 'MENTOR', percentage: 30, description: 'Guest speaker' }
        ],
        active: true
      },
      {
        appliesTo: 'Product Sales',
        description: '60% retained, 30% product team, 10% marketing',
        distribution: [
          { recipientType: 'pool', recipientId: 'COMPANY', percentage: 60, description: 'Company retention' },
          { recipientType: 'role', recipientId: 'INNOVATION_LEAD', percentage: 30, description: 'Product team' },
          { recipientType: 'role', recipientId: 'MEDIA_MANAGER', percentage: 10, description: 'Marketing team' }
        ],
        active: true
      },
      {
        appliesTo: 'Online Courses',
        description: '70% retained, 20% instructor, 10% editor',
        distribution: [
          { recipientType: 'pool', recipientId: 'COMPANY', percentage: 70, description: 'Company retention' },
          { recipientType: 'role', recipientId: 'COACHING_MANAGER', percentage: 20, description: 'Course instructor' },
          { recipientType: 'role', recipientId: 'MEDIA_MANAGER', percentage: 10, description: 'Content editor' }
        ],
        active: true
      }
    ]);

    console.log('✅ Created profit sharing rules');

    console.log('\n🎉 Seed data created successfully!\n');
    console.log('📧 Login credentials:');
    console.log('   Email: founder@connectshiksha.com');
    console.log('   Password: founder123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

// Run seed
seedData();

