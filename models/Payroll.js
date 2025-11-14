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
  },
  // Project financial data
  projectIncome: {
    type: Number,
    default: 0,
    min: 0
  },
  projectExpenses: {
    type: Number,
    default: 0,
    min: 0
  },
  projectBudget: {
    type: Number,
    default: 0,
    min: 0
  },
  netProfit: {
    type: Number,
    default: 0
  },
  // Member work tracking
  memberJoinedDate: {
    type: Date
  },
  memberLeftDate: {
    type: Date
  },
  workDurationDays: {
    type: Number,
    default: 0
  },
  projectStartDate: {
    type: Date
  },
  // Project manager bonus tracking
  isProjectOwner: {
    type: Boolean,
    default: false
  },
  memberIsActive: {
    type: Boolean,
    default: true
  },
  ownerBonus: {
    type: Number,
    default: 0,
    min: 0
  },
  // Optional: stored configured share percentage from project settings for visibility
  configuredSharePercent: {
    type: Number,
    required: false,
    min: 0
  }
}, {
  timestamps: true
});

// Calculate net amount before saving
payrollSchema.pre('save', function(next) {
  const salary = this.salaryAmount || this.baseSalary || 0;
  
  // If we have project financial data, use it for accurate calculation
  if (this.projectIncome && this.projectExpenses) {
    // netAmount should be the profit share only (since base salary is separate)
    this.netAmount = this.profitShare || 0;
  } else {
    // Fallback to traditional calculation
    this.netAmount = salary + this.profitShare + this.bonuses - this.deductions;
  }
  
  next();
});

// Compound index to ensure unique payroll per user per project per month
payrollSchema.index({ userId: 1, projectId: 1, month: 1 }, { unique: true });
// Additional index for project-based queries
payrollSchema.index({ projectId: 1, month: 1 });

module.exports = mongoose.model('Payroll', payrollSchema);
