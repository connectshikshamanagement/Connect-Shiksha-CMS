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

const fixProfitSharingRules = async () => {
  try {
    console.log('🔧 Fixing Profit Sharing Rules...');

    // Get actual team IDs
    const teams = await Team.find({});
    console.log('📋 Available teams:', teams.map(t => ({ name: t.name, id: t._id })));

    // Get actual role IDs
    const roles = await Role.find({});
    console.log('📋 Available roles:', roles.map(r => ({ key: r.key, name: r.name, id: r._id })));

    // Clear existing rules
    await ProfitSharingRule.deleteMany({});
    console.log('🗑️ Cleared existing profit sharing rules');

    // Find specific teams and roles
    const coachingTeam = teams.find(t => t.name.toLowerCase().includes('coaching'));
    const productTeam = teams.find(t => t.name.toLowerCase().includes('product'));
    const marketingTeam = teams.find(t => t.name.toLowerCase().includes('marketing'));

    const mentorRole = roles.find(r => r.key === 'MENTOR');
    const coachingManagerRole = roles.find(r => r.key === 'COACHING_MANAGER');
    const innovationLeadRole = roles.find(r => r.key === 'INNOVATION_LEAD');
    const mediaManagerRole = roles.find(r => r.key === 'MEDIA_MANAGER');

    console.log('🎯 Using teams:', {
      coaching: coachingTeam?.name || 'Not found',
      product: productTeam?.name || 'Not found',
      marketing: marketingTeam?.name || 'Not found'
    });

    console.log('🎯 Using roles:', {
      mentor: mentorRole?.name || 'Not found',
      coachingManager: coachingManagerRole?.name || 'Not found',
      innovationLead: innovationLeadRole?.name || 'Not found',
      mediaManager: mediaManagerRole?.name || 'Not found'
    });

    // 1. Coaching Rule: 70% company, 30% mentors
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
    const workshopDistribution = [
      {
        recipientType: 'pool',
        recipientId: 'company',
        percentage: 60,
        description: 'Company retained amount'
      }
    ];

    if (coachingTeam) {
      workshopDistribution.push({
        recipientType: 'team',
        recipientId: coachingTeam._id.toString(),
        percentage: 30,
        description: 'Distributed among coaching team'
      });
    } else {
      workshopDistribution.push({
        recipientType: 'role',
        recipientId: 'COACHING_MANAGER',
        percentage: 30,
        description: 'Coaching manager commission'
      });
    }

    if (mediaManagerRole) {
      workshopDistribution.push({
        recipientType: 'role',
        recipientId: 'MEDIA_MANAGER',
        percentage: 10,
        description: 'Lead generation bonus'
      });
    } else {
      workshopDistribution[0].percentage = 70; // Adjust company percentage if no media manager
    }

    await ProfitSharingRule.create({
      appliesTo: 'Paid Workshops',
      description: 'Workshop income distribution',
      distribution: workshopDistribution,
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
    const productDistribution = [
      {
        recipientType: 'pool',
        recipientId: 'company',
        percentage: 60,
        description: 'Company retained amount'
      }
    ];

    if (productTeam) {
      productDistribution.push({
        recipientType: 'team',
        recipientId: productTeam._id.toString(),
        percentage: 30,
        description: 'Product team commission'
      });
    } else {
      productDistribution.push({
        recipientType: 'role',
        recipientId: 'INNOVATION_LEAD',
        percentage: 30,
        description: 'Innovation lead commission'
      });
    }

    if (marketingTeam) {
      productDistribution.push({
        recipientType: 'team',
        recipientId: marketingTeam._id.toString(),
        percentage: 10,
        description: 'Marketing team commission'
      });
    } else {
      productDistribution[0].percentage = 70; // Adjust company percentage if no marketing team
    }

    await ProfitSharingRule.create({
      appliesTo: 'Product Sales',
      description: 'Product sales income distribution',
      distribution: productDistribution,
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

    console.log('✅ Profit sharing rules fixed and created successfully!');
    
    // Show created rules
    const createdRules = await ProfitSharingRule.find({});
    console.log('\n📋 Created Rules:');
    createdRules.forEach(rule => {
      console.log(`   ${rule.appliesTo}:`);
      rule.distribution.forEach(dist => {
        console.log(`     - ${dist.percentage}% to ${dist.recipientType} (${dist.recipientId})`);
      });
    });

  } catch (error) {
    console.error('❌ Error fixing profit sharing rules:', error);
  } finally {
    mongoose.connection.close();
  }
};

fixProfitSharingRules();
