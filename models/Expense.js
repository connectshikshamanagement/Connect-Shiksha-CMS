const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['Rent', 'Utilities', 'Logistics', 'Salaries', 'Marketing', 'Manufacturing', 'Production', 'Travel', 'Office Supplies', 'Other'],
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Please provide an amount'],
    min: 0
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a description']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other'],
    default: 'bank_transfer'
  },
  vendorName: {
    type: String
  },
  billNumber: {
    type: String
  },
  // Business unit for role-based scoping (e.g., Coaching, IOT, Robotics, Media)
  businessUnit: {
    type: String,
    enum: ['Coaching', 'IOT', 'Robotics', 'Media', 'Workshop', 'GuestLectures', 'Other'],
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attachment'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);

