const Joi = require('joi');

// Request validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    next();
  };
};

// Common validation schemas
const schemas = {
  // Auth schemas
  authLogin: Joi.object({
    email: Joi.string().email().lowercase(),
    teamCode: Joi.string().trim(),
    password: Joi.string().required().min(6)
  }).custom((value, helpers) => {
    if (!value.email && !value.teamCode) {
      return helpers.error('any.custom', { message: 'email or teamCode is required' });
    }
    return value;
  }, 'email or teamCode required'),
  // User schemas
  userCreate: Joi.object({
    name: Joi.string().required().trim().min(2).max(100),
    email: Joi.string().required().email().lowercase(),
    phone: Joi.string().required().pattern(/^[0-9]{10}$/),
    password: Joi.string().required().min(6),
    roleIds: Joi.array().items(Joi.string().hex().length(24)),
    salary: Joi.number().min(0).default(0)
  }),

  userUpdate: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    phone: Joi.string().pattern(/^[0-9]{10}$/),
    roleIds: Joi.array().items(Joi.string().hex().length(24)),
    salary: Joi.number().min(0),
    active: Joi.boolean()
  }),

  passwordUpdate: Joi.object({
    currentPassword: Joi.string().required().min(6),
    newPassword: Joi.string().required().min(6)
  }),
  passwordSet: Joi.object({
    newPassword: Joi.string().required().min(6)
  }),

  // Income schemas
  incomeCreate: Joi.object({
    sourceType: Joi.string().required().valid(
      'Coaching', 'Paid Workshops', 'Guest Lectures', 'Product Sales', 'Online Courses', 'Other'
    ),
    amount: Joi.number().required().min(0),
    date: Joi.date().default(() => new Date()),
    description: Joi.string().max(500),
    paymentMethod: Joi.string().valid('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other'),
    transactionId: Joi.string().max(100),
    clientId: Joi.string().hex().length(24),
    invoiceNumber: Joi.string().max(50)
  }),

  // Expense schemas
  expenseCreate: Joi.object({
    category: Joi.string().required().valid(
      'Rent', 'Utilities', 'Logistics', 'Salaries', 'Marketing', 
      'Manufacturing', 'Production', 'Travel', 'Office Supplies', 'Other'
    ),
    amount: Joi.number().required().min(0),
    date: Joi.date().default(() => new Date()),
    description: Joi.string().required().max(500),
    paymentMethod: Joi.string().valid('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other'),
    vendorName: Joi.string().max(100),
    billNumber: Joi.string().max(50),
    projectId: Joi.string().hex().length(24)
  }),

  // Project schemas
  projectCreate: Joi.object({
    title: Joi.string().required().trim().min(3).max(200),
    description: Joi.string().max(1000),
    category: Joi.string().required().valid(
      'Coaching', 'Workshops', 'Media', 'Innovation', 'Funding', 'Product Sales', 'Other'
    ),
    status: Joi.string().valid('planned', 'active', 'completed', 'on-hold', 'cancelled').default('planned'),
    teamId: Joi.string().required().hex().length(24),
    ownerId: Joi.string().required().hex().length(24),
    budget: Joi.number().min(0).default(0),
    startDate: Joi.date(),
    endDate: Joi.date().greater(Joi.ref('startDate')),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium')
  }),

  // Task schemas
  taskCreate: Joi.object({
    projectId: Joi.string().required().hex().length(24),
    title: Joi.string().required().trim().min(3).max(200),
    description: Joi.string().max(2000),
    status: Joi.string().valid('todo', 'in_progress', 'review', 'done', 'blocked').default('todo'),
    assigneeIds: Joi.array().items(Joi.string().hex().length(24)),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    dueDate: Joi.date(),
    estimatedHours: Joi.number().min(0),
    tags: Joi.array().items(Joi.string().trim().max(50))
  }),

  // Team schemas
  teamCreate: Joi.object({
    name: Joi.string().required().trim().min(2).max(100),
    description: Joi.string().max(500),
    leadUserId: Joi.string().required().hex().length(24),
    members: Joi.array().items(Joi.string().hex().length(24)),
    category: Joi.string().required().valid(
      'Funding & Innovation', 'Coaching Center', 'Media & Content', 'Workshop Teams', 'Other'
    )
  }),

  // Client schemas
  clientCreate: Joi.object({
    name: Joi.string().required().trim().min(2).max(200),
    type: Joi.string().required().valid(
      'School', 'College', 'CSR Partner', 'Individual', 'Corporate', 'Government', 'Other'
    ),
    status: Joi.string().valid(
      'lead', 'contacted', 'proposal_sent', 'negotiation', 'won', 'lost', 'inactive'
    ).default('lead'),
    contact: Joi.object({
      primaryName: Joi.string().required().trim(),
      designation: Joi.string().max(100),
      email: Joi.string().email(),
      phone: Joi.string().required(),
      alternatePhone: Joi.string(),
      address: Joi.object({
        street: Joi.string(),
        city: Joi.string(),
        state: Joi.string(),
        pincode: Joi.string(),
        country: Joi.string().default('India')
      })
    }).required(),
    ownerId: Joi.string().required().hex().length(24),
    expectedRevenue: Joi.number().min(0).default(0),
    notes: Joi.string().max(2000)
  }),

  // Product schemas
  productCreate: Joi.object({
    name: Joi.string().required().trim().min(2).max(200),
    sku: Joi.string().required().uppercase().min(3).max(50),
    description: Joi.string().max(1000),
    category: Joi.string().required().valid(
      'IoT Kits', 'Drones', 'Robotics Kits', 'Educational Materials', 'Other'
    ),
    costPrice: Joi.number().required().min(0),
    sellPrice: Joi.number().required().min(Joi.ref('costPrice')),
    stock: Joi.number().required().min(0).default(0),
    lowStockThreshold: Joi.number().min(0).default(10)
  }),

  // Sale schemas
  saleCreate: Joi.object({
    productId: Joi.string().required().hex().length(24),
    quantity: Joi.number().required().min(1).integer(),
    unitPrice: Joi.number().min(0),
    discount: Joi.number().min(0).default(0),
    buyer: Joi.object({
      name: Joi.string().required().trim(),
      email: Joi.string().email(),
      phone: Joi.string().required(),
      organization: Joi.string(),
      address: Joi.string()
    }).required(),
    paymentStatus: Joi.string().valid('pending', 'partial', 'paid').default('pending'),
    paymentMethod: Joi.string().valid('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other'),
    notes: Joi.string().max(500)
  })
};

module.exports = { validate, schemas };

