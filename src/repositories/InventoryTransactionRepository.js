const BaseRepository = require('./BaseRepository');
const { COLLECTIONS } = require('../config/constants');
const logger = require('../utils/logger');

class InventoryTransactionRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.INVENTORY_TRANSACTIONS);
  }

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
}

module.exports = new InventoryTransactionRepository();