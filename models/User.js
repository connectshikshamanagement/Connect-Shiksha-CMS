const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  passwordHash: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  roleIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  salary: {
    type: Number,
    default: 0,
    min: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  address: {
    type: String
  },
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountHolderName: String
  },
  // History tracking
  teamHistory: [{
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    joinedOn: {
      type: Date,
      default: Date.now
    },
    leftOn: Date,
    roleAtThatTime: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  taskHistory: [{
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    title: String,
    status: String,
    completedOn: Date,
    assignedOn: Date,
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    }
  }],
  expenseHistory: [{
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense'
    },
    amount: Number,
    category: String,
    date: Date,
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    status: String
  }],
  payrollHistory: [{
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll'
    },
    month: String,
    salaryAmount: Number,
    status: String,
    paymentDate: Date,
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Method to compare passwords
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);

