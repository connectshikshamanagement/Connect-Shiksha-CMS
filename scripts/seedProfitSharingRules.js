const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import models
const ProfitSharingRule = require('../models/ProfitSharingRule');
const Role = require('../models/Role');
const Team = require('../models/Team');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const seedProfitSharingRules = async () => {
  try {
    console.log('🌱 Seeding Profit Sharing Rules...');

    // Get roles and teams for distribution
    const mentorRole = await Role.findOne({ key: 'MENTOR' });
    const coachingManagerRole = await Role.findOne({ key: 'COACHING_MANAGER' });
    const innovationLeadRole = await Role.findOne({ key: 'INNOVATION_LEAD' });
    const mediaManagerRole = await Role.findOne({ key: 'MEDIA_MANAGER' });

    // Get teams
    const coachingTeam = await Team.findOne({ name: 'Coaching Team' });
    const productTeam = await Team.findOne({ name: 'Product Team' });
    const marketingTeam = await Team.findOne({ name: 'Marketing Team' });

    // Clear existing rules
    await ProfitSharingRule.deleteMany({});
    console.log('🗑️ Cleared existing profit sharing rules');

    // 1. Coaching Rule: 70% company, 30% instructors
    await ProfitSharingRule.create({
      appliesTo: 'Coaching',
      description: 'Coaching income distribution',
      distribution: [
        {
          recipientType: 'pool',
          recipientId: 'company',
          percentage: 70,
          description: 'Company retained amount'
        },
        {
          recipientType: 'role',
          recipientId: 'MENTOR',
          percentage: 30,
          description: 'Distributed among all mentors'
        }
      ],
      active: true
    });

    // 2. Paid Workshops Rule: 60% company, 30% team, 10% lead gen
    await ProfitSharingRule.create({
      appliesTo: 'Paid Workshops',
      description: 'Workshop income distribution',
      distribution: [
        {
          recipientType: 'pool',
          recipientId: 'company',
          percentage: 60,
          description: 'Company retained amount'
        },
        {
          recipientType: 'team',
          recipientId: coachingTeam?._id?.toString() || 'coaching-team',
          percentage: 30,
          description: 'Distributed among coaching team'
        },
        {
          recipientType: 'role',
          recipientId: 'MEDIA_MANAGER',
          percentage: 10,
          description: 'Lead generation bonus'
        }
      ],
      active: true
    });

    // 3. Guest Lectures Rule: 70% company, 30% speaker
    await ProfitSharingRule.create({
      appliesTo: 'Guest Lectures',
      description: 'Guest lecture income distribution',
      distribution: [
        {
          recipientType: 'pool',
          recipientId: 'company',
          percentage: 70,
          description: 'Company retained amount'
        },
        {
          recipientType: 'role',
          recipientId: 'MENTOR',
          percentage: 30,
          description: 'Speaker compensation'
        }
      ],
      active: true
    });

    // 4. Product Sales Rule: 60% company, 30% product team, 10% marketing
    await ProfitSharingRule.create({
      appliesTo: 'Product Sales',
      description: 'Product sales income distribution',
      distribution: [
        {
          recipientType: 'pool',
          recipientId: 'company',
          percentage: 60,
          description: 'Company retained amount'
        },
        {
          recipientType: 'team',
          recipientId: productTeam?._id?.toString() || 'product-team',
          percentage: 30,
          description: 'Product team commission'
        },
        {
          recipientType: 'team',
          recipientId: marketingTeam?._id?.toString() || 'marketing-team',
          percentage: 10,
          description: 'Marketing team commission'
        }
      ],
      active: true
    });

    // 5. Online Courses Rule: 70% company, 20% instructor, 10% editor
    await ProfitSharingRule.create({
      appliesTo: 'Online Courses',
      description: 'Online course income distribution',
      distribution: [
        {
          recipientType: 'pool',
          recipientId: 'company',
          percentage: 70,
          description: 'Company retained amount'
        },
        {
          recipientType: 'role',
          recipientId: 'MENTOR',
          percentage: 20,
          description: 'Instructor compensation'
        },
        {
          recipientType: 'role',
          recipientId: 'MEDIA_MANAGER',
          percentage: 10,
          description: 'Editor compensation'
        }
      ],
      active: true
    });

    console.log('✅ Profit sharing rules seeded successfully!');
    console.log('📋 Rules created:');
    console.log('   - Coaching: 70% company, 30% mentors');
    console.log('   - Paid Workshops: 60% company, 30% team, 10% lead gen');
    console.log('   - Guest Lectures: 70% company, 30% speaker');
    console.log('   - Product Sales: 60% company, 30% product team, 10% marketing');
    console.log('   - Online Courses: 70% company, 20% instructor, 10% editor');

  } catch (error) {
    console.error('❌ Error seeding profit sharing rules:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedProfitSharingRules();
