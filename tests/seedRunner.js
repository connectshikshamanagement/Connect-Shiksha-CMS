require('dotenv').config({ path: './tests/.env.test' });
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import models
const User = require('../models/User');
const Role = require('../models/Role');
const Team = require('../models/Team');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Payroll = require('../models/Payroll');
const Payout = require('../models/Payout');
const ProfitSharingRule = require('../models/ProfitSharingRule');

let mongoServer;

async function seedTestDB() {
  try {
    // Create in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✅ Test MongoDB Connected');

    // Clear existing data
    await mongoose.connection.db.dropDatabase();

    // 1. Create Roles
    const founderRole = await Role.create({
      name: 'FOUNDER',
      permissions: ['*'],
      description: 'Founder with all permissions'
    });

    const managerRole = await Role.create({
      name: 'TEAM_MANAGER',
      permissions: ['teams.read', 'teams.create', 'projects.read', 'projects.create', 'tasks.read', 'tasks.create', 'finance.read'],
      description: 'Team Manager'
    });

    const memberRole = await Role.create({
      name: 'TEAM_MEMBER',
      permissions: ['tasks.read', 'tasks.update'],
      description: 'Team Member'
    });

    // 2. Create Users
    const founder = await User.create({
      name: 'John Founder',
      email: 'founder@test.com',
      password: 'Test@123',
      role: founderRole._id,
      active: true,
      phone: '+1234567890'
    });

    const manager1 = await User.create({
      name: 'Alice Manager',
      email: 'manager1@test.com',
      password: 'Test@123',
      role: managerRole._id,
      active: true,
      phone: '+1234567891'
    });

    const manager2 = await User.create({
      name: 'Bob Manager',
      email: 'manager2@test.com',
      password: 'Test@123',
      role: managerRole._id,
      active: true,
      phone: '+1234567892'
    });

    const member1 = await User.create({
      name: 'Charlie Member',
      email: 'member1@test.com',
      password: 'Test@123',
      role: memberRole._id,
      active: true,
      phone: '+1234567893'
    });

    const member2 = await User.create({
      name: 'Diana Member',
      email: 'member2@test.com',
      password: 'Test@123',
      role: memberRole._id,
      active: true,
      phone: '+1234567894'
    });

    const member3 = await User.create({
      name: 'Edward Member',
      email: 'member3@test.com',
      password: 'Test@123',
      role: memberRole._id,
      active: true,
      phone: '+1234567895'
    });

    // 3. Create Teams
    const team1 = await Team.create({
      name: 'Development Team',
      category: 'Technology',
      monthlyBudget: 50000,
      creditLimit: 10000,
      leadUserId: manager1._id,
      members: [founder._id, manager1._id, member1._id, member2._id]
    });

    const team2 = await Team.create({
      name: 'Marketing Team',
      category: 'Marketing',
      monthlyBudget: 30000,
      creditLimit: 5000,
      leadUserId: manager2._id,
      members: [founder._id, manager2._id, member3._id]
    });

    const team3 = await Team.create({
      name: 'Sales Team',
      category: 'Sales',
      monthlyBudget: 40000,
      creditLimit: 8000,
      leadUserId: founder._id,
      members: [founder._id, manager1._id]
    });

    // 4. Create Projects
    const project1 = await Project.create({
      title: 'Web Application Development',
      description: 'Building a full-stack web application',
      category: 'Development',
      status: 'active',
      teamId: team1._id,
      allocatedBudget: 200000,
      assignedMembers: [founder._id, manager1._id, member1._id, member2._id],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31')
    });

    const project2 = await Project.create({
      title: 'Mobile App Development',
      description: 'Developing mobile applications',
      category: 'Development',
      status: 'active',
      teamId: team1._id,
      allocatedBudget: 150000,
      assignedMembers: [founder._id, manager1._id, member1._id],
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-11-30')
    });

    const project3 = await Project.create({
      title: 'Marketing Campaign 2024',
      description: 'Year-long marketing campaign',
      category: 'Marketing',
      status: 'active',
      teamId: team2._id,
      allocatedBudget: 100000,
      assignedMembers: [founder._id, manager2._id, member3._id],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31')
    });

    const project4 = await Project.create({
      title: 'Customer Acquisition',
      description: 'Acquire new customers',
      category: 'Sales',
      status: 'on-hold',
      teamId: team3._id,
      allocatedBudget: 50000,
      assignedMembers: [founder._id, manager1._id],
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-09-30')
    });

    // 5. Create Tasks
    const task1 = await Task.create({
      title: 'Implement Authentication',
      description: 'Add JWT authentication',
      status: 'in_progress',
      priority: 'high',
      assignedTo: [member1._id, member2._id],
      assignedBy: manager1._id,
      teamId: team1._id,
      projectId: project1._id,
      deadline: new Date('2024-12-15'),
      progress: 60
    });

    const task2 = await Task.create({
      title: 'Design UI Components',
      description: 'Create reusable UI components',
      status: 'todo',
      priority: 'medium',
      assignedTo: [member2._id],
      assignedBy: manager1._id,
      teamId: team1._id,
      projectId: project1._id,
      deadline: new Date('2024-12-20'),
      progress: 0
    });

    const task3 = await Task.create({
      title: 'Create Marketing Materials',
      description: 'Design brochures and banners',
      status: 'done',
      priority: 'medium',
      assignedTo: [member3._id],
      assignedBy: manager2._id,
      teamId: team2._id,
      projectId: project3._id,
      deadline: new Date('2024-12-10'),
      progress: 100
    });

    // 6. Create Income
    const income1 = await Income.create({
      amount: 50000,
      description: 'Project milestone payment',
      sourceType: 'project',
      projectId: project1._id,
      teamId: team1._id,
      receivedByUserId: founder._id,
      date: new Date('2024-10-01')
    });

    const income2 = await Income.create({
      amount: 30000,
      description: 'Client payment',
      sourceType: 'client',
      projectId: project3._id,
      teamId: team2._id,
      receivedByUserId: founder._id,
      date: new Date('2024-11-01')
    });

    // 7. Create Expenses
    const expense1 = await Expense.create({
      amount: 5000,
      description: 'Development tools',
      category: 'Software',
      teamId: team1._id,
      projectId: project1._id,
      userId: member1._id,
      date: new Date('2024-10-15'),
      status: 'approved'
    });

    const expense2 = await Expense.create({
      amount: 3000,
      description: 'Marketing materials',
      category: 'Marketing',
      teamId: team2._id,
      projectId: project3._id,
      userId: member3._id,
      date: new Date('2024-11-10'),
      status: 'approved'
    });

    // 8. Create Profit Sharing Rule
    await ProfitSharingRule.create({
      ruleName: 'Default Project Profit Sharing',
      founderPercentage: 70,
      teamPercentage: 30,
      isActive: true
    });

    // 9. Create Payouts (simulated from profit sharing)
    await Payout.create({
      userId: founder._id,
      projectId: project1._id,
      amount: 35000, // 70% of 50000
      month: 10,
      year: 2024,
      status: 'pending',
      paymentDate: null
    });

    await Payout.create({
      userId: member1._id,
      projectId: project1._id,
      amount: 5000, // Equal share of 30%
      month: 10,
      year: 2024,
      status: 'pending',
      paymentDate: null
    });

    // 10. Create Payroll
    await Payroll.create({
      userId: member1._id,
      projectId: project1._id,
      baseSalary: 30000,
      bonus: 5000,
      deductions: 2000,
      netAmount: 33000,
      month: 10,
      year: 2024,
      status: 'pending'
    });

    console.log('✅ Test database seeded successfully');
    console.log(`Created:`);
    console.log(`- ${await User.countDocuments()} users`);
    console.log(`- ${await Team.countDocuments()} teams`);
    console.log(`- ${await Project.countDocuments()} projects`);
    console.log(`- ${await Task.countDocuments()} tasks`);
    console.log(`- ${await Income.countDocuments()} income records`);
    console.log(`- ${await Expense.countDocuments()} expense records`);

    return {
      founder,
      manager1,
      manager2,
      member1,
      member2,
      member3,
      team1,
      team2,
      project1,
      project2,
      task1,
      income1,
      expense1
    };

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedTestDB()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

module.exports = { seedTestDB };
