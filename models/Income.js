const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  sourceType: {
    type: String,
    enum: ['Coaching', 'Paid Workshops', 'Guest Lectures', 'Product Sales', 'Online Courses', 'Other'],
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
  sourceRefId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sourceRefModel'
  },
  sourceRefModel: {
    type: String,
    enum: ['Project', 'Sale', 'Client', null]
  },
  receivedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other'],
    default: 'bank_transfer'
  },
  transactionId: {
    type: String
  },
  invoiceNumber: {
    type: String
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  profitShared: {
    type: Boolean,
    default: false
  },
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attachment'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Income', incomeSchema);

