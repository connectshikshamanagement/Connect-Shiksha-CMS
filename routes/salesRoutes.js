const express = require('express');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
const { computeProfitSharing } = require('../utils/profitSharing');

const router = express.Router();

router.use(protect);

// Get all sales
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('productId')
      .populate('soldBy')
      .sort('-date');

    res.status(200).json({
      success: true,
      count: sales.length,
      data: sales
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create sale
router.post('/', async (req, res) => {
  try {
    // Check product stock
    const product = await Product.findById(req.body.productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.stock < req.body.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.stock}`
      });
    }

    // Create sale
    const sale = await Sale.create({
      ...req.body,
      unitPrice: req.body.unitPrice || product.sellPrice,
      soldBy: req.user.id
    });

    // Update product stock
    product.stock -= req.body.quantity;
    await product.save();

    // Trigger profit sharing for product sales
    if (!sale.profitShared) {
      await computeProfitSharing({
        sourceType: 'Product Sales',
        amount: sale.finalAmount,
        _id: sale._id
      });
    }

    res.status(201).json({
      success: true,
      data: sale
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router
  .route('/:id')
  .get(async (req, res) => {
    try {
      const sale = await Sale.findById(req.params.id)
        .populate('productId')
        .populate('soldBy');

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found'
        });
      }

      res.status(200).json({
        success: true,
        data: sale
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  })
  .put(authorize('finance.update'), async (req, res) => {
    try {
      const sale = await Sale.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found'
        });
      }

      res.status(200).json({
        success: true,
        data: sale
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  })
  .delete(authorize('finance.delete'), async (req, res) => {
    try {
      const sale = await Sale.findByIdAndDelete(req.params.id);

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

module.exports = router;

