/**
 * Order Model
 * 
 * LEARNING NOTES:
 * Order schema represents customer purchases
 * - Embedded items for performance
 * - Status workflow tracking
 * - Pricing breakdown
 */

const Joi = require('joi');
const { ORDER_STATUS } = require('../config/constants');

const OrderSchema = {
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },

  userId: {
    type: 'ObjectId',
    required: true
  },

  customer: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },

  items: {
    type: Array,
    required: true,
    items: {
      productId: 'ObjectId',
      name: String,
      sku: String,
      quantity: Number,
      price: Number,
      discount: Number,
      subtotal: Number,
      variant: Object
    }
  },

  pricing: {
    subtotal: Number,
    discount: Number,
    tax: Number,
    shipping: Number,
    total: Number
  },

  shippingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },

  billingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },

  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING
  },

  statusHistory: {
    type: Array,
    default: [],
    items: {
      status: String,
      timestamp: Date,
      note: String,
      updatedBy: String
    }
  },

  payment: {
    method: String,
    status: String,
    transactionId: String
  },

  shipping: {
    method: String,
    trackingNumber: String,
    carrier: String,
    shippedAt: Date,
    estimatedDelivery: Date
  },

  customerNotes: String,
  internalNotes: String,

  completedAt: Date,
  cancelledAt: Date,

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
};

const OrderValidationSchema = Joi.object({
  userId: Joi.string().required(),
  
  customer: Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow('').optional()
  }).required(),

  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      price: Joi.number().min(0).optional(),
      discount: Joi.number().min(0).default(0),
      variant: Joi.object().optional()
    })
  ).min(1).required(),

  shippingAddress: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().required()
  }).required(),

  billingAddress: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().required()
  }).required(),

  payment: Joi.object({
    method: Joi.string().required()
  }).required(),

  shipping: Joi.object({
    method: Joi.string().default('STANDARD')
  }).optional(),

  pricing: Joi.object({
    discount: Joi.number().min(0).default(0),
    tax: Joi.number().min(0).optional(),
    shipping: Joi.number().min(0).default(0)
  }).optional(),

  customerNotes: Joi.string().allow('').default(''),
  internalNotes: Joi.string().allow('').default('')
});

const OrderIndexes = [
  {
    key: { orderNumber: 1 },
    unique: true,
    name: 'order_number_unique'
  },
  {
    key: { userId: 1, createdAt: -1 },
    name: 'user_orders_index'
  },
  {
    key: { status: 1, createdAt: -1 },
    name: 'status_date_index'
  },
  {
    key: { 'customer.email': 1 },
    name: 'customer_email_index'
  }
];

module.exports = {
  OrderSchema,
  OrderValidationSchema,
  OrderIndexes
};