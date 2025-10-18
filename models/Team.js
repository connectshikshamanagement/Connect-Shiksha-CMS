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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);

