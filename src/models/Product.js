/**
 * Product Model
 * 
 * LEARNING NOTES - MONGODB SCHEMA DESIGN DECISIONS:
 * 
 * 1. EMBEDDED VS REFERENCED:
 *    - Variants: EMBEDDED (always accessed with product, small array)
 *    - Categories: REFERENCED (categories are shared, need separate queries)
 *    - Images: EMBEDDED (always displayed with product)
 * 
 * 2. INDEXING STRATEGY:
 *    - Text index on name + description (full-text search)
 *    - Compound index on category + price (common filter)
 *    - Index on SKU (unique, frequent lookups)
 *    - Index on status (filter active products)
 * 
 * 3. WHY THIS STRUCTURE:
 *    - Denormalization for read performance (e-commerce is read-heavy)
 *    - Single query gets all product data (no joins!)
 *    - Trade-off: Slight write complexity for massive read gains
 */

const Joi = require('joi');
const { PRODUCT_STATUS } = require('../config/constants');

/**
 * Product Schema Definition
 * This is the "shape" of documents in products collection
 */
const ProductSchema = {
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    minLength: 3,
    maxLength: 200
  },
  
  description: {
    type: String,
    required: true,
    trim: true,
    minLength: 10,
    maxLength: 2000
  },
  
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    match: /^[A-Z0-9-]+$/  // Only uppercase letters, numbers, hyphens
  },

  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0.01,
    max: 999999.99
  },

  compareAtPrice: {
    type: Number,
    default: null,  // For showing discounts
    min: 0
  },

  cost: {
    type: Number,  // Cost price for profit calculations
    default: 0,
    min: 0
  },

  // Categories (Referenced - store ObjectIds)
  categoryId: {
    type: 'ObjectId',  // Reference to categories collection
    required: true
  },

  // Additional categorization
  tags: {
    type: Array,
    default: [],
    items: String
  },

  brand: {
    type: String,
    default: null
  },

  // Inventory
  inventory: {
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    reserved: {
      type: Number,  // Quantity reserved in pending orders
      default: 0,
      min: 0
    },
    available: {
      type: Number,  // Computed: quantity - reserved
      default: 0,
      min: 0
    },
    reorderPoint: {
      type: Number,
      default: 10
    },
    reorderQuantity: {
      type: Number,
      default: 50
    }
  },

  // Status
  status: {
    type: String,
    enum: Object.values(PRODUCT_STATUS),
    default: PRODUCT_STATUS.AVAILABLE
  },

  // Images (Embedded)
  images: {
    type: Array,
    default: [],
    items: {
      url: String,
      alt: String,
      isPrimary: Boolean
    }
  },

  // Variants (Embedded - e.g., sizes, colors)
  variants: {
    type: Array,
    default: [],
    items: {
      name: String,        // e.g., "Size: Large, Color: Red"
      sku: String,
      price: Number,
      quantity: Number,
      attributes: Object   // Flexible key-value pairs
    }
  },

  // Specifications (Embedded - flexible structure)
  specifications: {
    type: Object,
    default: {}
    // Example: { weight: "1kg", dimensions: "10x10x10cm", material: "Cotton" }
  },

  // SEO
  seo: {
    metaTitle: String,
    metaDescription: String,
    slug: String  // URL-friendly version of name
  },

  // Ratings & Reviews (summary only)
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Sales Statistics (denormalized for performance)
  salesStats: {
    totalSold: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    lastSoldAt: {
      type: Date,
      default: null
    }
  },

  // Flags
  isFeatured: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: true
  },

  // Timestamps
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
    default: null  // Soft delete
  }
};

/**
 * Joi Validation Schema for Product
 * Used to validate input before inserting to MongoDB
 */
const ProductValidationSchema = Joi.object({
  name: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  sku: Joi.string().uppercase().pattern(/^[A-Z0-9-]+$/).required(),
  price: Joi.number().min(0.01).max(999999.99).required(),
  compareAtPrice: Joi.number().min(0).allow(null).optional(),
  cost: Joi.number().min(0).default(0),
  categoryId: Joi.string().required(),  // Will be converted to ObjectId
  tags: Joi.array().items(Joi.string()).default([]),
  brand: Joi.string().allow(null).optional(),
  
  inventory: Joi.object({
    quantity: Joi.number().min(0).required(),
    reorderPoint: Joi.number().min(0).default(10),
    reorderQuantity: Joi.number().min(1).default(50)
  }).default(),

  status: Joi.string().valid(...Object.values(PRODUCT_STATUS)).default(PRODUCT_STATUS.AVAILABLE),
  
  images: Joi.array().items(Joi.object({
    url: Joi.string().uri().required(),
    alt: Joi.string().default(''),
    isPrimary: Joi.boolean().default(false)
  })).default([]),

  variants: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    sku: Joi.string().required(),
    price: Joi.number().min(0).required(),
    quantity: Joi.number().min(0).required(),
    attributes: Joi.object().default({})
  })).default([]),

  specifications: Joi.object().default({}),

  seo: Joi.object({
    metaTitle: Joi.string().optional(),
    metaDescription: Joi.string().optional(),
    slug: Joi.string().optional()
  }).optional(),

  isFeatured: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true)
});

/**
 * Index Definitions
 * These will be created in the database
 */
const ProductIndexes = [
  // Text search index
  {
    key: { name: 'text', description: 'text', tags: 'text' },
    name: 'product_text_search'
  },
  
  // Unique SKU
  {
    key: { sku: 1 },
    unique: true,
    name: 'sku_unique'
  },

  // Category + Price (common filter)
  {
    key: { categoryId: 1, price: 1 },
    name: 'category_price_index'
  },

  // Status + isActive (filter active products)
  {
    key: { status: 1, isActive: 1 },
    name: 'status_active_index'
  },

  // Featured products
  {
    key: { isFeatured: 1, createdAt: -1 },
    name: 'featured_index'
  },

  // Sales stats for analytics
  {
    key: { 'salesStats.totalSold': -1 },
    name: 'top_sellers_index'
  }
];

module.exports = {
  ProductSchema,
  ProductValidationSchema,
  ProductIndexes
};