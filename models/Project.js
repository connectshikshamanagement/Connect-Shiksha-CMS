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
  // Detailed member tracking with join dates
  memberDetails: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedDate: {
      type: Date,
      default: Date.now
    },
    leftDate: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // Optional, stored configuration for custom share percentage within the 30% team pool
    // This value represents the intended percentage weight for this member and
    // will be normalized during computation. Keep null when using defaults.
    sharePercentage: {
      type: Number,
      min: 0,
      default: null
    }
  }],
  // Temporary field to receive join dates from frontend (not persisted to DB)
  memberJoinDates: {
    type: mongoose.Schema.Types.Mixed,
    select: false
  },
  // Temporary field to receive custom share percentage mapping from frontend (not persisted to DB)
  memberSharePercents: {
    type: mongoose.Schema.Types.Mixed,
    select: false
  },
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

// Pre-save hook to automatically add founder and sync memberDetails
projectSchema.pre('save', async function(next) {
  try {
    const User = require('./User');
    const Role = require('./Role');
    
    // Find the founder
    const founderRole = await Role.findOne({ key: 'FOUNDER' });
    if (founderRole) {
      const founder = await User.findOne({ 
        roleIds: { $in: [founderRole._id] },
        active: true 
      });
      
      if (founder && !this.projectMembers.includes(founder._id)) {
        this.projectMembers.push(founder._id);
        console.log(`✅ Auto-added founder to project: ${this.title}`);
      }
    }
    
    // Sync projectMembers with memberDetails for backward compatibility
    if (this.projectMembers && this.projectMembers.length > 0) {
      // Ensure all projectMembers are in memberDetails
      for (const memberId of this.projectMembers) {
        const existingDetail = this.memberDetails.find(
          detail => detail.userId.toString() === memberId.toString()
        );
        
        if (!existingDetail) {
          // Determine join date priority:
          // 1. Use memberJoinDates if provided (from frontend)
          // 2. Use project start date if this is a new project
          // 3. Use current date as fallback
          let joinDate;
          if (this.memberJoinDates && this.memberJoinDates[memberId]) {
            joinDate = new Date(this.memberJoinDates[memberId]);
          } else if (this.isNew) {
            joinDate = this.startDate || new Date();
          } else {
            joinDate = new Date();
          }
          
          this.memberDetails.push({
            userId: memberId,
            joinedDate: joinDate,
            isActive: true,
            // Set initial sharePercentage if provided in this save
            sharePercentage: this.memberSharePercents && this.memberSharePercents[memberId]
              ? Number(this.memberSharePercents[memberId])
              : null
          });
          
          console.log(`✅ Added member ${memberId} to project with join date: ${joinDate.toLocaleDateString()}`);
        } else {
          // Update existing member's join date if provided
          if (this.memberJoinDates && this.memberJoinDates[memberId]) {
          // Update existing member's join date if provided
          const newJoinDate = new Date(this.memberJoinDates[memberId]);
          if (existingDetail.joinedDate.getTime() !== newJoinDate.getTime()) {
            existingDetail.joinedDate = newJoinDate;
            console.log(`✅ Updated join date for member ${memberId}: ${newJoinDate.toLocaleDateString()}`);
          }
          }
          // Update existing member's share percentage if provided
          if (this.memberSharePercents && this.memberSharePercents[memberId] !== undefined) {
            const newPct = Number(this.memberSharePercents[memberId]);
            if (!Number.isNaN(newPct)) {
              existingDetail.sharePercentage = newPct;
              console.log(`✅ Set custom share % for member ${memberId}: ${newPct}%`);
            }
          }
        }
      }
      
      // Mark members not in projectMembers as inactive
      for (const detail of this.memberDetails) {
        const stillMember = this.projectMembers.some(
          memberId => memberId.toString() === detail.userId.toString()
        );
        
        if (!stillMember && detail.isActive) {
          detail.isActive = false;
          detail.leftDate = new Date();
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in project pre-save hook:', error);
    next(error);
  }
});

module.exports = mongoose.model('Project', projectSchema);

