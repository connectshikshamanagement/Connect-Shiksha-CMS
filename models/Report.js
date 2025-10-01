const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['income_expense', 'profit_trend', 'team_performance', 'sales_performance', 'attendance', 'custom'],
    required: true
  },
  query: {
    type: mongoose.Schema.Types.Mixed
  },
  filters: {
    startDate: Date,
    endDate: Date,
    category: String,
    teamId: mongoose.Schema.Types.ObjectId,
    projectId: mongoose.Schema.Types.ObjectId
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastRun: {
    type: Date
  },
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly']
    },
    recipients: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);

