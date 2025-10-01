const mongoose = require('mongoose');

const shareDetailSchema = new mongoose.Schema({
  sourceType: {
    type: String,
    required: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  description: {
    type: String
  }
}, { _id: false });

const payoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  baseSalary: {
    type: Number,
    min: 0,
    default: 0
  },
  shares: [shareDetailSchema],
  totalShares: {
    type: Number,
    min: 0,
    default: 0
  },
  bonuses: {
    type: Number,
    min: 0,
    default: 0
  },
  deductions: {
    type: Number,
    min: 0,
    default: 0
  },
  netAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'cancelled'],
    default: 'pending'
  },
  paidOn: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'cheque', 'upi', 'other']
  },
  transactionId: {
    type: String
  },
  notes: {
    type: String
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Calculate totals before saving
payoutSchema.pre('save', function(next) {
  this.totalShares = this.shares.reduce((sum, share) => sum + share.amount, 0);
  this.netAmount = this.baseSalary + this.totalShares + this.bonuses - this.deductions;
  next();
});

// Compound index to prevent duplicate payouts
payoutSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payout', payoutSchema);

