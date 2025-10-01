const express = require('express');
const { createController } = require('../controllers/genericController');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const productController = createController(Product);

router.use(protect);

router
  .route('/')
  .get(productController.getAll)
  .post(authorize('finance.create'), productController.create);

router
  .route('/:id')
  .get(productController.getOne)
  .put(authorize('finance.update'), productController.update)
  .delete(authorize('finance.delete'), productController.delete);

module.exports = router;

