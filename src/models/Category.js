/**
 * Category Model
 * 
 * LEARNING NOTES - HIERARCHICAL DATA IN MONGODB:
 * 
 * 1. PATTERN USED: Parent Reference Pattern
 *    - Each category stores its parent's ID
 *    - Efficient for queries like "get all subcategories"
 *    - Alternative patterns: Child Reference, Materialized Path, Nested Sets
 * 
 * 2. WHY PARENT REFERENCE:
 *    - Simple to implement
 *    - Easy to move categories around
 *    - Efficient for most common queries
 * 
 * 3. CATEGORY STRUCTURE EXAMPLE:
 *    Electronics (parent: null)
 *      └─ Laptops (parent: Electronics_ID)
 *           └─ Gaming Laptops (parent: Laptops_ID)
 */

const Joi = require('joi');

const CategorySchema = {
  name: {
    type: String,
    required: true,
    trim: true,
    minLength: 2,
    maxLength: 100
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  description: {
    type: String,
    default: '',
    maxLength: 500
  },

  // Parent Reference for hierarchy
  parentId: {
    type: 'ObjectId',
    default: null  // null = root category
  },

  // Denormalized path for quick lookups
  // Example: "Electronics > Laptops > Gaming"
  path: {
    type: String,
    default: ''
  },

  // Hierarchy level (0 = root, 1 = sub, 2 = sub-sub, etc.)
  level: {
    type: Number,
    default: 0,
    min: 0
  },

  // Category image
  image: {
    url: String,
    alt: String
  },

  // Display order
  order: {
    type: Number,
    default: 0
  },

  // Product count (denormalized for performance)
  productCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // SEO
  seo: {
    metaTitle: String,
    metaDescription: String
  },

  // Status
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
  }
};

const CategoryValidationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  slug: Joi.string().lowercase().required(),
  description: Joi.string().max(500).default(''),
  parentId: Joi.string().allow(null).optional(),
  image: Joi.object({
    url: Joi.string().uri().required(),
    alt: Joi.string().default('')
  }).optional(),
  order: Joi.number().default(0),
  isActive: Joi.boolean().default(true),
  seo: Joi.object({
    metaTitle: Joi.string().optional(),
    metaDescription: Joi.string().optional()
  }).optional()
});

const CategoryIndexes = [
  {
    key: { slug: 1 },
    unique: true,
    name: 'slug_unique'
  },
  {
    key: { parentId: 1, order: 1 },
    name: 'parent_order_index'
  },
  {
    key: { isActive: 1 },
    name: 'active_categories'
  },
  {
    key: { level: 1 },
    name: 'level_index'
  }
];

module.exports = {
  CategorySchema,
  CategoryValidationSchema,
  CategoryIndexes
};