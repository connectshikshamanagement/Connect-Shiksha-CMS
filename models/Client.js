const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    required: true
  },
  nextFollowUp: {
    type: Date
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a client name'],
    trim: true
  },
  type: {
    type: String,
    enum: ['School', 'College', 'CSR Partner', 'Individual', 'Corporate', 'Government', 'Other'],
    required: true
  },
  status: {
    type: String,
    enum: ['lead', 'contacted', 'proposal_sent', 'negotiation', 'won', 'lost', 'inactive'],
    default: 'lead'
  },
  contact: {
    primaryName: {
      type: String,
      required: true
    },
    designation: String,
    email: {
      type: String,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      required: true
    },
    alternatePhone: String,
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: 'India'
      }
    }
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please assign an owner']
  },
  followUps: [followUpSchema],
  proposals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attachment'
  }],
  contracts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attachment'
  }],
  totalRevenue: {
    type: Number,
    min: 0,
    default: 0
  },
  expectedRevenue: {
    type: Number,
    min: 0,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String
  },
  website: {
    type: String
  },
  socialMedia: {
    linkedin: String,
    facebook: String,
    twitter: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Client', clientSchema);

