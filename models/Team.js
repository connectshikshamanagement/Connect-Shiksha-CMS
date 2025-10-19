const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a team name'],
    unique: true,
    trim: true
  },
  description: {
    type: String
  },
  leadUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please assign a team lead']
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  category: {
    type: String,
    enum: ['Funding & Innovation', 'Coaching Center', 'Media & Content', 'Workshop Teams', 'Other'],
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  // Financial controls
  monthlyBudget: {
    type: Number,
    default: 0,
    min: 0
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  // Auto-calculated fields (virtual)
  currentExpense: {
    type: Number,
    default: 0
  },
  remainingBudget: {
    type: Number,
    default: 0
  },
  // Per-member budget tracking
  memberBudgets: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    monthlyLimit: {
      type: Number,
      default: 0,
      min: 0
    },
    currentExpense: {
      type: Number,
      default: 0,
      min: 0
    },
    remainingBudget: {
      type: Number,
      default: 0
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Pre-save hook to automatically add founder to all teams
teamSchema.pre('save', async function(next) {
  try {
    const User = require('./User');
    const Role = require('./Role');
    
    // Find the founder
    const founderRole = await Role.findOne({ key: 'FOUNDER' });
    if (!founderRole) return next();
    
    const founder = await User.findOne({ 
      roleIds: { $in: [founderRole._id] },
      active: true 
    });
    
    if (founder && !this.members.includes(founder._id)) {
      this.members.push(founder._id);
      console.log(`✅ Auto-added founder to team: ${this.name}`);
    }
    
    next();
  } catch (error) {
    console.error('Error auto-adding founder to team:', error);
    next(error);
  }
});

module.exports = mongoose.model('Team', teamSchema);

