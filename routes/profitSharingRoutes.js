const express = require('express');
const { createController } = require('../controllers/genericController');
const ProfitSharingRule = require('../models/ProfitSharingRule');
const { protect, authorize } = require('../middleware/auth');
const { computeProfitSharing } = require('../utils/profitSharing');
const Income = require('../models/Income');

const router = express.Router();
const ruleController = createController(ProfitSharingRule);

router.use(protect);
router.use(authorize('finance.read'));

// Get all rules
router.get('/rules', ruleController.getAll);

// Create rule
router.post('/rules', authorize('finance.create'), ruleController.create);

// Update rule
router.put('/rules/:id', authorize('finance.update'), ruleController.update);

// Delete rule
router.delete('/rules/:id', authorize('finance.delete'), ruleController.delete);

// Manually trigger profit sharing computation for an income
router.post('/compute/:incomeId', authorize('finance.update'), async (req, res) => {
  try {
    const income = await Income.findById(req.params.incomeId);

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Income record not found'
      });
    }

    if (income.profitShared) {
      return res.status(400).json({
        success: false,
        message: 'Profit sharing already computed for this income'
      });
    }

    await computeProfitSharing(income);

    res.status(200).json({
      success: true,
      message: 'Profit sharing computed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

