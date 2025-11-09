const BaseRepository = require('./BaseRepository');
const { COLLECTIONS, ORDER_STATUS } = require('../config/constants');
const { ObjectId } = require('mongodb');
const logger = require('../utils/logger');

class OrderRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.ORDERS);
  }

  async findByOrderNumber(orderNumber) {
    try {
      return await this.findOne({ orderNumber: orderNumber.toUpperCase() });
    } catch (error) {
      logger.error('Error finding order by number:', error);
      throw error;
    }
  }

  async getOrdersByUser(userId, options = {}) {
    try {
      const filter = { userId: this.toObjectId(userId) };
      const { sort = { createdAt: -1 }, limit = 10, skip = 0 } = options;

      return await this.findMany(filter, { sort, limit, skip });
    } catch (error) {
      logger.error('Error getting user orders:', error);
      throw error;
    }
  }

  async getOrdersByStatus(status, options = {}) {
    try {
      const filter = { status };
      const { sort = { createdAt: -1 }, limit = 50, skip = 0 } = options;

      return await this.findMany(filter, { sort, limit, skip });
    } catch (error) {
      logger.error('Error getting orders by status:', error);
      throw error;
    }
  }

  async searchOrders(filters = {}) {
    try {
      const {
        userId = null,
        status = null,
        startDate = null,
        endDate = null,
        minTotal = null,
        maxTotal = null,
        page = 1,
        limit = 10
      } = filters;

      const query = {};

      if (userId) query.userId = this.toObjectId(userId);
      if (status) query.status = status;

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      if (minTotal || maxTotal) {
        query['pricing.total'] = {};
        if (minTotal) query['pricing.total'].$gte = minTotal;
        if (maxTotal) query['pricing.total'].$lte = maxTotal;
      }

      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        this.findMany(query, { sort: { createdAt: -1 }, limit, skip }),
        this.count(query)
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching orders:', error);
      throw error;
    }
  }

  async getOrderStats() {
    try {
      const pipeline = [
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$pricing.total' },
            averageOrderValue: { $avg: '$pricing.total' },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.PENDING] }, 1, 0] }
            },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.DELIVERED] }, 1, 0] }
            }
          }
        }
      ];

      const result = await this.aggregate(pipeline);
      return result[0] || {};
    } catch (error) {
      logger.error('Error getting order stats:', error);
      throw error;
    }
  }

  async getRevenueByDateRange(startDate, endDate) {
    try {
      const pipeline = [
        {
          $match: {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            },
            status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED] }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            revenue: { $sum: '$pricing.total' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ];

      return await this.aggregate(pipeline);
    } catch (error) {
      logger.error('Error getting revenue by date:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId, newStatus, note = '', updatedBy = 'SYSTEM') {
    try {
      const collection = this.getCollection();
      const objectId = this.toObjectId(orderId);

      const statusEntry = {
        status: newStatus,
        timestamp: new Date(),
        note,
        updatedBy
      };

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        {
          $set: {
            status: newStatus,
            updatedAt: new Date()
          },
          $push: {
            statusHistory: statusEntry
          }
        },
        { returnDocument: 'after' }
      );

      return result;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  async generateOrderNumber() {
    try {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      
      const count = await this.count({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      const sequence = String(count + 1).padStart(4, '0');
      return `ORD-${dateStr}-${sequence}`;
    } catch (error) {
      logger.error('Error generating order number:', error);
      throw error;
    }
  }
}

module.exports = new OrderRepository();