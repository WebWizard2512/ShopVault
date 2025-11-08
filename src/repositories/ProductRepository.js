/**
 * Product Repository
 * 
 * LEARNING NOTES - ADVANCED MONGODB QUERIES:
 * 
 * 1. SEARCH METHODS:
 *    - Text Search: MongoDB's $text operator (requires text index)
 *    - Range Queries: $gte, $lte for price filtering
 *    - Array Matching: $in for categories, tags
 *    - Regex: For partial matching (use sparingly, no index!)
 * 
 * 2. AGGREGATION PIPELINE:
 *    - $lookup: "Join" with categories (like SQL JOIN)
 *    - $match: Filter documents
 *    - $project: Select fields
 *    - $sort: Order results
 *    - $facet: Multiple aggregations in one query!
 * 
 * 3. PERFORMANCE TIPS:
 *    - Always filter BEFORE joining ($match before $lookup)
 *    - Use indexes for common queries
 *    - Limit results with $limit
 *    - Project only needed fields
 */

const BaseRepository = require('./BaseRepository');
const { COLLECTIONS, PRODUCT_STATUS } = require('../config/constants');
const { ObjectId } = require('mongodb');
const logger = require('../utils/logger');

class ProductRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.PRODUCTS);
  }

  /**
   * Advanced Product Search with Multiple Filters
   * This is the CORE of e-commerce search!
   * 
   * @param {Object} searchParams
   * @param {string} searchParams.query - Text search query
   * @param {string} searchParams.categoryId - Filter by category
   * @param {number} searchParams.minPrice - Minimum price
   * @param {number} searchParams.maxPrice - Maximum price
   * @param {string} searchParams.status - Product status
   * @param {Array} searchParams.tags - Filter by tags
   * @param {string} searchParams.brand - Filter by brand
   * @param {number} searchParams.page - Page number
   * @param {number} searchParams.limit - Results per page
   * @param {string} searchParams.sort - Sort field (price, name, created)
   * @param {string} searchParams.order - Sort order (asc, desc)
   */
  async search(searchParams = {}) {
    try {
      const {
        query = '',
        categoryId = null,
        minPrice = null,
        maxPrice = null,
        status = null,
        tags = [],
        brand = null,
        page = 1,
        limit = 10,
        sort = 'createdAt',
        order = 'desc'
      } = searchParams;

      // Build filter object
      const filter = {
        isActive: true,
        deletedAt: null
      };

      // Text search (uses text index)
      if (query && query.trim()) {
        filter.$text = { $search: query };
      }

      // Category filter
      if (categoryId) {
        filter.categoryId = this.toObjectId(categoryId);
      }

      // Price range
      if (minPrice !== null || maxPrice !== null) {
        filter.price = {};
        if (minPrice !== null) filter.price.$gte = minPrice;
        if (maxPrice !== null) filter.price.$lte = maxPrice;
      }

      // Status filter
      if (status) {
        filter.status = status;
      }

      // Tags filter
      if (tags && tags.length > 0) {
        filter.tags = { $in: tags };
      }

      // Brand filter
      if (brand) {
        filter.brand = brand;
      }

      // Sort options
      const sortOptions = {};
      if (query && query.trim()) {
        // Text search score for relevance
        sortOptions.score = { $meta: 'textScore' };
      }
      sortOptions[sort] = order === 'asc' ? 1 : -1;

      // Pagination
      const skip = (page - 1) * limit;

      // Execute query
      const options = {
        sort: sortOptions,
        limit,
        skip
      };

      // Add text score projection if text search
      if (query && query.trim()) {
        options.projection = { score: { $meta: 'textScore' } };
      }

      // Get products and total count in parallel
      const [products, total] = await Promise.all([
        this.findMany(filter, options),
        this.count(filter)
      ]);

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get Products with Category Details (using aggregation)
   * LEARNING: This demonstrates $lookup (MongoDB's JOIN)
   */
  async getProductsWithCategory(filter = {}, options = {}) {
    try {
      const { limit = 10, skip = 0, sort = { createdAt: -1 } } = options;

      const pipeline = [
        // Stage 1: Match products
        { $match: { ...filter, isActive: true, deletedAt: null } },

        // Stage 2: Lookup category details
        {
          $lookup: {
            from: COLLECTIONS.CATEGORIES,
            localField: 'categoryId',
            foreignField: '_id',
            as: 'category'
          }
        },

        // Stage 3: Unwind category array (converts array to object)
        {
          $unwind: {
            path: '$category',
            preserveNullAndEmptyArrays: true
          }
        },

        // Stage 4: Sort
        { $sort: sort },

        // Stage 5: Pagination
        { $skip: skip },
        { $limit: limit },

        // Stage 6: Project (select fields)
        {
          $project: {
            name: 1,
            description: 1,
            sku: 1,
            price: 1,
            'inventory.available': 1,
            status: 1,
            images: 1,
            'category.name': 1,
            'category.slug': 1,
            createdAt: 1
          }
        }
      ];

      const products = await this.aggregate(pipeline);
      return products;
    } catch (error) {
      logger.error('Error getting products with category:', error);
      throw error;
    }
  }

  /**
   * Get Low Stock Products
   * @param {number} threshold - Stock threshold
   */
  async getLowStockProducts(threshold = 10) {
    try {
      const filter = {
        'inventory.available': { $lte: threshold, $gt: 0 },
        status: PRODUCT_STATUS.AVAILABLE,
        isActive: true,
        deletedAt: null
      };

      const products = await this.findMany(filter, {
        sort: { 'inventory.available': 1 }
      });

      return products;
    } catch (error) {
      logger.error('Error getting low stock products:', error);
      throw error;
    }
  }

  /**
   * Get Out of Stock Products
   */
  async getOutOfStockProducts() {
    try {
      const filter = {
        'inventory.available': 0,
        status: { $ne: PRODUCT_STATUS.DISCONTINUED },
        isActive: true,
        deletedAt: null
      };

      return await this.findMany(filter);
    } catch (error) {
      logger.error('Error getting out of stock products:', error);
      throw error;
    }
  }

/**
 * Update Product Inventory - ATOMIC OPERATION
 * @param {string} productId
 * @param {number} quantityChange - Positive to add, negative to reduce
 */
async updateInventory(productId, quantityChange) {
  try {
    const collection = this.getCollection();
    const objectId = this.toObjectId(productId);

    // SINGLE ATOMIC OPERATION - All changes in one update
    const result = await collection.findOneAndUpdate(
      { _id: objectId },
      [
        {
          $set: {
            // Increment quantity
            'inventory.quantity': { $add: ['$inventory.quantity', quantityChange] },
            // Recalculate available = quantity - reserved
            'inventory.available': {
              $subtract: [
                { $add: ['$inventory.quantity', quantityChange] },
                '$inventory.reserved'
              ]
            },
            // Update status based on new available stock
            status: {
              $cond: {
                if: {
                  $lte: [
                    {
                      $subtract: [
                        { $add: ['$inventory.quantity', quantityChange] },
                        '$inventory.reserved'
                      ]
                    },
                    0
                  ]
                },
                then: 'OUT_OF_STOCK',
                else: 'AVAILABLE'
              }
            },
            updatedAt: new Date()
          }
        }
      ],
      { returnDocument: 'after' }
    );

    if (!result) {
      return null;
    }

    logger.debug(`Inventory updated atomically for product: ${productId}`);
    return result;

  } catch (error) {
    logger.error('Error updating inventory:', error);
    throw error;
  }
}

  /**
   * Reserve Inventory for Order
   * @param {string} productId
   * @param {number} quantity
   */
  async reserveInventory(productId, quantity) {
    try {
      const collection = this.getCollection();
      const objectId = this.toObjectId(productId);

      // Check if enough stock available
      const product = await this.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.inventory.available < quantity) {
        throw new Error('Insufficient stock available');
      }

      // Atomic update: increment reserved, decrement available
      const result = await collection.findOneAndUpdate(
        {
          _id: objectId,
          'inventory.available': { $gte: quantity }
        },
        {
          $inc: {
            'inventory.reserved': quantity,
            'inventory.available': -quantity
          },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Failed to reserve inventory');
      }

      return result.value;
    } catch (error) {
      logger.error('Error reserving inventory:', error);
      throw error;
    }
  }

  /**
   * Release Reserved Inventory
   * @param {string} productId
   * @param {number} quantity
   */
  async releaseInventory(productId, quantity) {
    try {
      const collection = this.getCollection();
      const objectId = this.toObjectId(productId);

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        {
          $inc: {
            'inventory.reserved': -quantity,
            'inventory.available': quantity
          },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );

      return result.value;
    } catch (error) {
      logger.error('Error releasing inventory:', error);
      throw error;
    }
  }

  /**
   * Get Top Selling Products
   * @param {number} limit
   */
  async getTopSellers(limit = 10) {
    try {
      const pipeline = [
        {
          $match: {
            isActive: true,
            deletedAt: null,
            'salesStats.totalSold': { $gt: 0 }
          }
        },
        {
          $sort: { 'salesStats.totalSold': -1 }
        },
        {
          $limit: limit
        },
        {
          $project: {
            name: 1,
            sku: 1,
            price: 1,
            'salesStats.totalSold': 1,
            'salesStats.revenue': 1,
            images: { $arrayElemAt: ['$images', 0] }
          }
        }
      ];

      return await this.aggregate(pipeline);
    } catch (error) {
      logger.error('Error getting top sellers:', error);
      throw error;
    }
  }

  /**
   * Get Product by SKU
   * @param {string} sku
   */
  async findBySku(sku) {
    try {
      return await this.findOne({ sku: sku.toUpperCase() });
    } catch (error) {
      logger.error('Error finding product by SKU:', error);
      throw error;
    }
  }

  /**
   * Update Product Sales Stats
   * Called after an order is completed
   * 
   * @param {string} productId
   * @param {number} quantitySold
   * @param {number} revenue
   */
  async updateSalesStats(productId, quantitySold, revenue) {
    try {
      const collection = this.getCollection();
      const objectId = this.toObjectId(productId);

      await collection.updateOne(
        { _id: objectId },
        {
          $inc: {
            'salesStats.totalSold': quantitySold,
            'salesStats.revenue': revenue
          },
          $set: {
            'salesStats.lastSoldAt': new Date(),
            updatedAt: new Date()
          }
        }
      );
    } catch (error) {
      logger.error('Error updating sales stats:', error);
      throw error;
    }
  }

  /**
   * Bulk Price Update
   * @param {Object} filter - Products to update
   * @param {number} percentage - Percentage change (10 for +10%, -10 for -10%)
   */
  async bulkPriceUpdate(filter, percentage) {
    try {
      const collection = this.getCollection();
      
      // Calculate multiplier (1.10 for +10%, 0.90 for -10%)
      const multiplier = 1 + (percentage / 100);

      const result = await collection.updateMany(
        filter,
        [
          {
            $set: {
              price: { $multiply: ['$price', multiplier] },
              updatedAt: new Date()
            }
          }
        ]
      );

      logger.info(`Updated prices for ${result.modifiedCount} products by ${percentage}%`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error in bulk price update:', error);
      throw error;
    }
  }
}

module.exports = new ProductRepository();