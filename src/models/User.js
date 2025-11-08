/**
 * User Model
 */

const Joi = require('joi');
const { USER_ROLES } = require('../config/constants');

const UserSchema = {
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  firstName: {
    type: String,
    required: true,
    trim: true
  },

  lastName: {
    type: String,
    required: true,
    trim: true
  },

  phone: {
    type: String,
    default: ''
  },

  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.CUSTOMER
  },

  addresses: {
    type: Array,
    default: [],
    items: {
      label: String,
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      isDefault: Boolean
    }
  },

  wishlist: {
    type: Array,
    default: [],
    items: {
      productId: 'ObjectId',
      addedAt: Date,
      notes: String
    }
  },

  orderStats: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    lastOrderDate: {
      type: Date,
      default: null
    }
  },

  preferences: {
    newsletter: {
      type: Boolean,
      default: true
    },
    notifications: {
      email: Boolean,
      sms: Boolean
    }
  },

  isActive: {
    type: Boolean,
    default: true
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  lastLoginAt: Date,

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  deletedAt: {
    type: Date,
    default: null
  }
};

const UserValidationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).required(),
  lastName: Joi.string().min(2).required(),
  phone: Joi.string().allow('').default(''),
  role: Joi.string().valid(...Object.values(USER_ROLES)).default(USER_ROLES.CUSTOMER),
  
  addresses: Joi.array().items(
    Joi.object({
      label: Joi.string().required(),
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      postalCode: Joi.string().required(),
      country: Joi.string().required(),
      isDefault: Joi.boolean().default(false)
    })
  ).default([]),

  preferences: Joi.object({
    newsletter: Joi.boolean().default(true),
    notifications: Joi.object({
      email: Joi.boolean().default(true),
      sms: Joi.boolean().default(false)
    }).default()
  }).optional()
});

const UserIndexes = [
  {
    key: { email: 1 },
    unique: true,
    name: 'email_unique'
  },
  {
    key: { role: 1 },
    name: 'role_index'
  },
  {
    key: { isActive: 1 },
    name: 'active_users_index'
  }
];

module.exports = {
  UserSchema,
  UserValidationSchema,
  UserIndexes
};