const dbManager = require('../config/database');
const { COLLECTIONS, ORDER_STATUS } = require('../config/constants');
const logger = require('../utils/logger');
const dayjs = require('dayjs');

class AnalyticsService {
  async getDashboardSummary() {
    try {
      const db = dbManager.getDb();

      const startOfMonth = dayjs().startOf('month').toDate();
      const endOfMonth = dayjs().endOf('month').toDate();

      const [
        productStats,
        orderStats,
        monthlyRevenue,
        topProducts
      ] = await Promise.all([
        db.collection(COLLECTIONS.PRODUCTS).aggregate([
          { $match: { isActive: true, deletedAt: null } },
          {
            $group: {
              _id: null,
              totalProducts: { $sum: 1 },
              totalValue: { $sum: { $multiply: ['$price', '$inventory.quantity'] } },
              lowStockCount: {
                $sum: { $cond: [{ $lte: ['$inventory.available', 10] }, 1, 0] }
              },
              outOfStockCount: {
                $sum: { $cond: [{ $eq: ['$inventory.available', 0] }, 1, 0] }
              }
            }
          }
        ]).toArray(),

        db.collection(COLLECTIONS.ORDERS).aggregate([
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$pricing.total' },
              pendingOrders: {
                $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.PENDING] }, 1, 0] }
              },
              completedOrders: {
                $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.DELIVERED] }, 1, 0] }
              }
            }
          }
        ]).toArray(),

        db.collection(COLLECTIONS.ORDERS).aggregate([
          {
            $match: {
              createdAt: { $gte: startOfMonth, $lte: endOfMonth },
              status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED] }
            }
          },
          {
            $group: {
              _id: null,
              revenue: { $sum: '$pricing.total' },
              orderCount: { $sum: 1 }
            }
          }
        ]).toArray(),

        db.collection(COLLECTIONS.PRODUCTS).aggregate([
          {
            $match: {
              isActive: true,
              'salesStats.totalSold': { $gt: 0 }
            }
          },
          { $sort: { 'salesStats.totalSold': -1 } },
          { $limit: 5 },
          {
            $project: {
              name: 1,
              sku: 1,
              'salesStats.totalSold': 1,
              'salesStats.revenue': 1
            }
          }
        ]).toArray()
      ]);

      return {
        products: productStats[0] || {},
        orders: orderStats[0] || {},
        monthlyRevenue: monthlyRevenue[0] || { revenue: 0, orderCount: 0 },
        topProducts
      };

    } catch (error) {
      logger.error('Error getting dashboard summary:', error);
      throw error;
    }
  }

  async getSalesByPeriod(period = 'month', startDate = null, endDate = null) {
    try {
      const db = dbManager.getDb();

      let start, end;
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        switch (period) {
          case 'today':
            start = dayjs().startOf('day').toDate();
            end = dayjs().endOf('day').toDate();
            break;
          case 'week':
            start = dayjs().startOf('week').toDate();
            end = dayjs().endOf('week').toDate();
            break;
          case 'month':
            start = dayjs().startOf('month').toDate();
            end = dayjs().endOf('month').toDate();
            break;
          case 'year':
            start = dayjs().startOf('year').toDate();
            end = dayjs().endOf('year').toDate();
            break;
          default:
            start = dayjs().subtract(30, 'days').toDate();
            end = new Date();
        }
      }

      const pipeline = [
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
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

      return await db.collection(COLLECTIONS.ORDERS).aggregate(pipeline).toArray();

    } catch (error) {
      logger.error('Error getting sales by period:', error);
      throw error;
    }
  }

  async getCategoryPerformance() {
    try {
      const db = dbManager.getDb();

      const pipeline = [
        { $match: { isActive: true, deletedAt: null } },
        {
          $lookup: {
            from: COLLECTIONS.CATEGORIES,
            localField: 'categoryId',
            foreignField: '_id',
            as: 'category'
          }
        },
        { $unwind: '$category' },
        {
          $group: {
            _id: '$categoryId',
            categoryName: { $first: '$category.name' },
            productCount: { $sum: 1 },
            totalSold: { $sum: '$salesStats.totalSold' },
            totalRevenue: { $sum: '$salesStats.revenue' },
            avgPrice: { $avg: '$price' }
          }
        },
        { $sort: { totalRevenue: -1 } }
      ];

      return await db.collection(COLLECTIONS.PRODUCTS).aggregate(pipeline).toArray();

    } catch (error) {
      logger.error('Error getting category performance:', error);
      throw error;
    }
  }

  async getCustomerAnalytics() {
    try {
      const db = dbManager.getDb();

      const pipeline = [
        { $match: { role: 'CUSTOMER', deletedAt: null } },
        {
          $project: {
            email: 1,
            firstName: 1,
            lastName: 1,
            'orderStats.totalOrders': 1,
            'orderStats.totalSpent': 1,
            'orderStats.lastOrderDate': 1,
            wishlistCount: { $size: '$wishlist' }
          }
        },
        { $sort: { 'orderStats.totalSpent': -1 } },
        { $limit: 20 }
      ];

      return await db.collection(COLLECTIONS.USERS).aggregate(pipeline).toArray();

    } catch (error) {
      logger.error('Error getting customer analytics:', error);
      throw error;
    }
  }

  async getInventoryValue() {
    try {
      const db = dbManager.getDb();

      const pipeline = [
        { $match: { isActive: true, deletedAt: null } },
        {
          $group: {
            _id: null,
            totalValue: { $sum: { $multiply: ['$cost', '$inventory.quantity'] } },
            totalRetailValue: { $sum: { $multiply: ['$price', '$inventory.quantity'] } },
            totalItems: { $sum: '$inventory.quantity' }
          }
        }
      ];

      const result = await db.collection(COLLECTIONS.PRODUCTS).aggregate(pipeline).toArray();
      return result[0] || {};

    } catch (error) {
      logger.error('Error getting inventory value:', error);
      throw error;
    }
  }

  async getOrderStatusDistribution() {
    try {
      const db = dbManager.getDb();

      const pipeline = [
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$pricing.total' }
          }
        },
        { $sort: { count: -1 } }
      ];

      return await db.collection(COLLECTIONS.ORDERS).aggregate(pipeline).toArray();

    } catch (error) {
      logger.error('Error getting order status distribution:', error);
      throw error;
    }
  }

  async getRevenueTrends() {
    try {
      const db = dbManager.getDb();
      
      const last7Days = dayjs().subtract(7, 'days').toDate();

      const pipeline = [
        {
          $match: {
            createdAt: { $gte: last7Days },
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
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ];

      const result = await db.collection(COLLECTIONS.ORDERS).aggregate(pipeline).toArray();

      return result.map(r => ({
        date: `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`,
        revenue: r.revenue,
        orders: r.orders
      }));

    } catch (error) {
      logger.error('Error getting revenue trends:', error);
      throw error;
    }
  }

  async getInventoryTurnover() {
    try {
      const db = dbManager.getDb();

      const pipeline = [
        {
          $match: {
            isActive: true,
            'salesStats.totalSold': { $gt: 0 }
          }
        },
        {
          $project: {
            name: 1,
            sku: 1,
            totalSold: '$salesStats.totalSold',
            currentStock: '$inventory.quantity',
            turnoverRate: {
              $cond: [
                { $eq: ['$inventory.quantity', 0] },
                0,
                { $divide: ['$salesStats.totalSold', '$inventory.quantity'] }
              ]
            }
          }
        },
        { $sort: { turnoverRate: -1 } },
        { $limit: 20 }
      ];

      return await db.collection(COLLECTIONS.PRODUCTS).aggregate(pipeline).toArray();

    } catch (error) {
      logger.error('Error getting inventory turnover:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();