/**
 * Inventory Transaction Model
 */

const Joi = require('joi');
const { TRANSACTION_TYPES } = require('../config/constants');

const InventoryTransactionSchema = {
  productId: {
    type: 'ObjectId',
    required: true
  },

  type: {
    type: String,
    enum: Object.values(TRANSACTION_TYPES),
    required: true
  },

  quantity: {
    type: Number,
    required: true
  },

  // Quantity before transaction
  quantityBefore: {
    type: Number,
    default: 0
  },

  // Quantity after transaction
  quantityAfter: {
    type: Number,
    default: 0
  },

  // Reference to order if transaction is related to order
  orderId: {
    type: 'ObjectId',
    default: null
  },

  // Notes about the transaction
  notes: {
    type: String,
    default: ''
  },

  // Who performed the transaction
  performedBy: {
    type: String,
    default: 'SYSTEM'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
};

const InventoryTransactionValidationSchema = Joi.object({
  productId: Joi.string().required(),
  type: Joi.string().valid(...Object.values(TRANSACTION_TYPES)).required(),
  quantity: Joi.number().required(),
  quantityBefore: Joi.number().default(0),
  quantityAfter: Joi.number().default(0),
  orderId: Joi.string().allow(null).optional(),
  notes: Joi.string().allow('').default(''),
  performedBy: Joi.string().default('SYSTEM')
});

const InventoryTransactionIndexes = [
  {
    key: { productId: 1, createdAt: -1 },
    name: 'product_date_index'
  },
  {
    key: { type: 1, createdAt: -1 },
    name: 'type_date_index'
  },
  {
    key: { orderId: 1 },
    name: 'order_index'
  }
];

module.exports = {
  InventoryTransactionSchema,
  InventoryTransactionValidationSchema,
  InventoryTransactionIndexes
};