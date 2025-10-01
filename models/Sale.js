const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    min: 0,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  buyer: {
    name: {
      type: String,
      required: true
    },
    email: String,
    phone: {
      type: String,
      required: true
    },
    organization: String,
    address: String
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other']
  },
  soldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNumber: {
    type: String,
    unique: true
  },
  notes: {
    type: String
  },
  profitShared: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Calculate final amount before saving
saleSchema.pre('save', function(next) {
  this.total = this.quantity * this.unitPrice;
  this.finalAmount = this.total - this.discount;
  next();
});

module.exports = mongoose.model('Sale', saleSchema);

