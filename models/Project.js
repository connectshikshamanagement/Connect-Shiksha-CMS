const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a project title'],
    trim: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    enum: ['Coaching', 'Workshops', 'Media', 'Innovation', 'Funding', 'Product Sales', 'Other'],
    required: true
  },
  status: {
    type: String,
    enum: ['planned', 'active', 'completed', 'on-hold', 'cancelled'],
    default: 'planned'
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Please assign a team']
  },
  projectMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please assign a project owner']
  },
  budget: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDealAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  allocatedBudget: {
    type: Number,
    default: 0,
    min: 0
  },
  totalIncome: {
    type: Number,
    default: 0,
    min: 0
  },
  totalExpense: {
    type: Number,
    default: 0,
    min: 0
  },
  investmentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attachment'
  }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save hook to automatically add founder to all projects
projectSchema.pre('save', async function(next) {
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
    
    if (founder && !this.projectMembers.includes(founder._id)) {
      this.projectMembers.push(founder._id);
      console.log(`✅ Auto-added founder to project: ${this.title}`);
    }
    
    next();
  } catch (error) {
    console.error('Error auto-adding founder to project:', error);
    next(error);
  }
});

module.exports = mongoose.model('Project', projectSchema);

