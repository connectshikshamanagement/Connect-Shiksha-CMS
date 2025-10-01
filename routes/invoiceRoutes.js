const express = require('express');
const { createController } = require('../controllers/genericController');
const Invoice = require('../models/Invoice');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const invoiceController = createController(Invoice);

router.use(protect);

router
  .route('/')
  .get(invoiceController.getAll)
  .post(authorize('finance.create'), async (req, res) => {
    try {
      // Generate invoice number
      const count = await Invoice.countDocuments();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const invoice = await Invoice.create({
        ...req.body,
        invoiceNumber,
        createdBy: req.user.id
      });

      res.status(201).json({
        success: true,
        data: invoice
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
  .get(invoiceController.getOne)
  .put(authorize('finance.update'), invoiceController.update)
  .delete(authorize('finance.delete'), invoiceController.delete);

module.exports = router;

