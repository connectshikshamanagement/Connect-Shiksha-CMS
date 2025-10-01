const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'Please provide a SKU'],
    unique: true,
    uppercase: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    enum: ['IoT Kits', 'Drones', 'Robotics Kits', 'Educational Materials', 'Other'],
    required: true
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellPrice: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    min: 0,
    default: 10
  },
  images: [{
    type: String
  }],
  specifications: {
    type: Map,
    of: String
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
  return this.sellPrice - this.costPrice;
});

// Virtual for profit percentage
productSchema.virtual('profitPercentage').get(function() {
  return ((this.sellPrice - this.costPrice) / this.costPrice * 100).toFixed(2);
});

module.exports = mongoose.model('Product', productSchema);

