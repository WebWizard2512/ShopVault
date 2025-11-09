/**
 * Product Repository (OPTIMIZED & FIXED)
 */

const BaseRepository = require('./BaseRepository');
const { COLLECTIONS, PRODUCT_STATUS } = require('../config/constants');
const { ObjectId } = require('mongodb');
const logger = require('../utils/logger');

class ProductRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.PRODUCTS);
  }

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

      const filter = {
        isActive: true,
        deletedAt: null
      };

      if (query && query.trim()) {
        filter.$text = { $search: query };
      }

      if (categoryId) {
        filter.categoryId = this.toObjectId(categoryId);
      }

      if (minPrice !== null || maxPrice !== null) {
        filter.price = {};
        if (minPrice !== null) filter.price.$gte = minPrice;
        if (maxPrice !== null) filter.price.$lte = maxPrice;
      }

      if (status) {
        filter.status = status;
      }

      if (tags && tags.length > 0) {
        filter.tags = { $in: tags };
      }

      if (brand) {
        filter.brand = brand;
      }

      const sortOptions = {};
      if (query && query.trim()) {
        sortOptions.score = { $meta: 'textScore' };
      }
      sortOptions[sort] = order === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      const options = {
        sort: sortOptions,
        limit,
        skip
      };

      if (query && query.trim()) {
        options.projection = { score: { $meta: 'textScore' } };
      }

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

  async getProductsWithCategory(filter = {}, options = {}) {
    try {
      const { limit = 10, skip = 0, sort = { createdAt: -1 } } = options;

      const pipeline = [
        { $match: { ...filter, isActive: true, deletedAt: null } },
        {
          $lookup: {
            from: COLLECTIONS.CATEGORIES,
            localField: 'categoryId',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $unwind: {
            path: '$category',
            preserveNullAndEmptyArrays: true
          }
        },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            name: 1,
            sku: 1,
            price: 1,
            'inventory.available': 1,
            status: 1,
            'category.name': 1,
            'category.slug': 1,
            createdAt: 1
          }
        }
      ];

      return await this.aggregate(pipeline);
    } catch (error) {
      logger.error('Error getting products with category:', error);
      throw error;
    }
  }

  async getLowStockProducts(threshold = 10) {
    try {
      const filter = {
        'inventory.available': { $lte: threshold, $gt: 0 },
        status: PRODUCT_STATUS.AVAILABLE,
        isActive: true,
        deletedAt: null
      };

      return await this.findMany(filter, {
        sort: { 'inventory.available': 1 }
      });
    } catch (error) {
      logger.error('Error getting low stock products:', error);
      throw error;
    }
  }

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
   * CRITICAL FIX: Update Product Inventory - ATOMIC OPERATION
   * This is now a SINGLE atomic operation instead of multiple updates
   */
  async updateInventory(productId, quantityChange) {
    try {
      const collection = this.getCollection();
      const objectId = this.toObjectId(productId);

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        [
          {
            $set: {
              'inventory.quantity': { $add: ['$inventory.quantity', quantityChange] },
              'inventory.available': {
                $subtract: [
                  { $add: ['$inventory.quantity', quantityChange] },
                  '$inventory.reserved'
                ]
              },
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

      return result || null;

    } catch (error) {
      logger.error('Error updating inventory:', error);
      throw error;
    }
  }

  async reserveInventory(productId, quantity) {
    try {
      const collection = this.getCollection();
      const objectId = this.toObjectId(productId);

      const product = await this.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.inventory.available < quantity) {
        throw new Error('Insufficient stock available');
      }

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

      if (!result) {
        throw new Error('Failed to reserve inventory');
      }

      return result;
    } catch (error) {
      logger.error('Error reserving inventory:', error);
      throw error;
    }
  }

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

      return result;
    } catch (error) {
      logger.error('Error releasing inventory:', error);
      throw error;
    }
  }

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
        { $sort: { 'salesStats.totalSold': -1 } },
        { $limit: limit },
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

  async findBySku(sku) {
    try {
      return await this.findOne({ sku: sku.toUpperCase() });
    } catch (error) {
      logger.error('Error finding product by SKU:', error);
      throw error;
    }
  }

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

  async bulkPriceUpdate(filter, percentage) {
    try {
      const collection = this.getCollection();
      
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