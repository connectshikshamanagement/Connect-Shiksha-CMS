const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide a user ID']
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Please provide a team ID']
  },
  month: {
    type: String,
    required: [true, 'Please provide a month'],
    match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format']
  },
  salaryAmount: {
    type: Number,
    required: [true, 'Please provide salary amount'],
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'cash', 'cheque', 'other'],
    default: 'bank_transfer'
  },
  transactionId: {
    type: String
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique payroll per user per month
payrollSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
