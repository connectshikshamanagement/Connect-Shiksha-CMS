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
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false // Optional for backward compatibility
  },
  month: {
    type: String,
    required: [true, 'Please provide a month'],
    match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format']
  },
  year: {
    type: Number,
    required: false // For new profit sharing system
  },
  baseSalary: {
    type: Number,
    default: 0,
    min: 0
  },
  salaryAmount: {
    type: Number,
    required: false, // Made optional for new system
    min: 0
  },
  profitShare: {
    type: Number,
    default: 0,
    min: 0
  },
  bonuses: {
    type: Number,
    default: 0,
    min: 0
  },
  deductions: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'cancelled'],
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
  description: {
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

// Calculate net amount before saving
payrollSchema.pre('save', function(next) {
  const salary = this.salaryAmount || this.baseSalary || 0;
  this.netAmount = salary + this.profitShare + this.bonuses - this.deductions;
  next();
});

// Compound index to ensure unique payroll per user per project per month
payrollSchema.index({ userId: 1, projectId: 1, month: 1 }, { unique: true });
// Additional index for project-based queries
payrollSchema.index({ projectId: 1, month: 1 });

module.exports = mongoose.model('Payroll', payrollSchema);
