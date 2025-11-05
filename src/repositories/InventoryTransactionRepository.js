/**
 * Inventory Transaction Repository
 * 
 * LEARNING NOTES:
 * Inventory transactions = Audit trail
 * Every stock movement is logged here
 * Critical for compliance and debugging
 */

const BaseRepository = require('./BaseRepository');
const { COLLECTIONS } = require('../config/constants');
const logger = require('../utils/logger');

class InventoryTransactionRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.INVENTORY_TRANSACTIONS);
  }

  /**
   * Log transaction
   */
  async logTransaction(transactionData) {
    try {
      const transaction = {
        ...transactionData,
        createdAt: new Date()
      };

      return await this.create(transaction);
    } catch (error) {
      logger.error('Error logging transaction:', error);
      throw error;
    }
  }

  /**
   * Get transactions by product
   */
  async getByProduct(productId, options = {}) {
    try {
      const filter = { productId: this.toObjectId(productId) };
      const { sort = { createdAt: -1 }, limit = 50 } = options;

      return await this.findMany(filter, { sort, limit });
    } catch (error) {
      logger.error('Error getting product transactions:', error);
      throw error;
    }
  }

  /**
   * Get transactions by type
   */
  async getByType(type, options = {}) {
    try {
      const filter = { type };
      const { sort = { createdAt: -1 }, limit = 100 } = options;

      return await this.findMany(filter, { sort, limit });
    } catch (error) {
      logger.error('Error getting transactions by type:', error);
      throw error;
    }
  }

  /**
   * Get transactions by date range
   */
  async getByDateRange(startDate, endDate, options = {}) {
    try {
      const filter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      const { sort = { createdAt: -1 }, limit = 500 } = options;

      return await this.findMany(filter, { sort, limit });
    } catch (error) {
      logger.error('Error getting transactions by date:', error);
      throw error;
    }
  }

  /**
   * Get transaction summary
   */
  async getTransactionSummary() {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' }
          }
        },
        { $sort: { count: -1 } }
      ];

      return await this.aggregate(pipeline);
    } catch (error) {
      logger.error('Error getting transaction summary:', error);
      throw error;
    }
  }
}

module.exports = new InventoryTransactionRepository();