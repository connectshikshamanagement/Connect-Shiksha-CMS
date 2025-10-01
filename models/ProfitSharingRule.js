const mongoose = require('mongoose');

const distributionSchema = new mongoose.Schema({
  recipientType: {
    type: String,
    enum: ['role', 'team', 'user', 'pool'],
    required: true
  },
  recipientId: {
    type: String, // Can be role key, team ID, or user ID
    required: true
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  description: {
    type: String
  }
}, { _id: false });

const profitSharingRuleSchema = new mongoose.Schema({
  appliesTo: {
    type: String,
    enum: ['Coaching', 'Paid Workshops', 'Guest Lectures', 'Product Sales', 'Online Courses'],
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  distribution: [distributionSchema],
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Validate that total distribution equals 100%
profitSharingRuleSchema.pre('save', function(next) {
  const total = this.distribution.reduce((sum, dist) => sum + dist.percentage, 0);
  if (Math.abs(total - 100) > 0.01) {
    return next(new Error(`Total distribution must equal 100%, currently ${total}%`));
  }
  next();
});

module.exports = mongoose.model('ProfitSharingRule', profitSharingRuleSchema);

