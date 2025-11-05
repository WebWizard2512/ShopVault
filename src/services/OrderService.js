/**
 * Order Service
 * 
 * LEARNING NOTES - ORDER MANAGEMENT:
 * 
 * Critical Operations:
 * 1. Inventory Reservation: Lock stock when order created
 * 2. Status Workflow: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
 * 3. Inventory Release: Free stock if order cancelled
 * 4. Transaction Logging: Audit trail for every operation
 * 
 * Uses MongoDB Transactions for atomicity!
 */

const orderRepository = require('../repositories/OrderRepository');
const productRepository = require('../repositories/ProductRepository');
const userRepository = require('../repositories/UserRepository');
const inventoryTransactionRepo = require('../repositories/InventoryTransactionRepository');
const userService = require('./UserService');
const { OrderValidationSchema } = require('../models/Order');
const { ORDER_STATUS, TRANSACTION_TYPES } = require('../config/constants');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError, BusinessLogicError } = require('../utils/errorHandler');
const { ObjectId } = require('mongodb');

class OrderService {
  /**
   * Create new order
   */
  async createOrder(orderData) {
    try {
      // Step 1: Validate input
      const { error, value } = OrderValidationSchema.validate(orderData, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(d => d.message).join(', ');
        throw new ValidationError(`Validation failed: ${errors}`);
      }

      // Step 2: Verify user exists
      const user = await userRepository.findById(value.userId);
      if (!user) {
        throw new NotFoundError('User', value.userId);
      }

      // Step 3: Validate and reserve inventory for all items
      const processedItems = [];
      let subtotal = 0;

      for (const item of value.items) {
        // Get product details
        const product = await productRepository.findById(item.productId);
        if (!product) {
          throw new NotFoundError('Product', item.productId);
        }

        // Check stock availability
        if (product.inventory.available < item.quantity) {
          throw new BusinessLogicError(
            `Insufficient stock for ${product.name}. Available: ${product.inventory.available}, Requested: ${item.quantity}`
          );
        }

        // Reserve inventory
        await productRepository.reserveInventory(item.productId, item.quantity);

        // Calculate item subtotal
        const itemPrice = item.price || product.price;
        const itemDiscount = item.discount || 0;
        const itemSubtotal = (itemPrice - itemDiscount) * item.quantity;

        processedItems.push({
          productId: new ObjectId(item.productId),
          name: product.name,
          sku: product.sku,
          quantity: item.quantity,
          price: itemPrice,
          discount: itemDiscount,
          subtotal: itemSubtotal,
          variant: item.variant || null
        });

        subtotal += itemSubtotal;

        // Log inventory transaction
        await inventoryTransactionRepo.logTransaction({
          productId: new ObjectId(item.productId),
          type: TRANSACTION_TYPES.SALE,
          quantity: -item.quantity,
          quantityBefore: product.inventory.quantity,
          quantityAfter: product.inventory.quantity - item.quantity,
          notes: 'Reserved for order',
          performedBy: 'SYSTEM'
        });
      }

      // Step 4: Calculate pricing
      const discount = value.pricing?.discount || 0;
      const tax = value.pricing?.tax || subtotal * 0.1; // 10% tax
      const shipping = value.pricing?.shipping || 0;
      const total = subtotal - discount + tax + shipping;

      // Step 5: Generate order number
      const orderNumber = await orderRepository.generateOrderNumber();

      // Step 6: Create order document
      const orderDoc = {
        orderNumber,
        userId: new ObjectId(value.userId),
        customer: {
          firstName: value.customer.firstName,
          lastName: value.customer.lastName,
          email: value.customer.email,
          phone: value.customer.phone || ''
        },
        items: processedItems,
        pricing: {
          subtotal,
          discount,
          tax,
          shipping,
          total
        },
        shippingAddress: value.shippingAddress,
        billingAddress: value.billingAddress,
        status: ORDER_STATUS.PENDING,
        statusHistory: [{
          status: ORDER_STATUS.PENDING,
          timestamp: new Date(),
          note: 'Order created',
          updatedBy: 'SYSTEM'
        }],
        payment: {
          method: value.payment.method,
          status: 'PENDING'
        },
        shipping: value.shipping || {},
        customerNotes: value.customerNotes || '',
        internalNotes: value.internalNotes || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Step 7: Create order
      const order = await orderRepository.create(orderDoc);

      // Step 8: Update user order stats
      await userService.updateOrderStats(value.userId, total);

      logger.success(`Order created: ${order.orderNumber}`);
      return order;

    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId) {
    try {
      const order = await orderRepository.findById(orderId);
      
      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      return order;

    } catch (error) {
      logger.error('Error getting order:', error);
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber) {
    try {
      const order = await orderRepository.findByOrderNumber(orderNumber);
      
      if (!order) {
        throw new NotFoundError('Order', orderNumber);
      }

      return order;

    } catch (error) {
      logger.error('Error getting order by number:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, newStatus, note = '', updatedBy = 'ADMIN') {
    try {
      const order = await orderRepository.findById(orderId);
      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      // Validate status transition
      this.validateStatusTransition(order.status, newStatus);

      // Update status
      const updatedOrder = await orderRepository.updateOrderStatus(
        orderId,
        newStatus,
        note,
        updatedBy
      );

      // Handle status-specific actions
      await this.handleStatusChange(order, newStatus);

      logger.success(`Order ${order.orderNumber} status updated to ${newStatus}`);
      return updatedOrder;

    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(currentStatus, newStatus) {
    const allowedTransitions = {
      [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.REFUNDED],
      [ORDER_STATUS.CANCELLED]: [],
      [ORDER_STATUS.REFUNDED]: []
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new BusinessLogicError(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Handle status-specific actions
   */
  async handleStatusChange(order, newStatus) {
    try {
      switch (newStatus) {
        case ORDER_STATUS.CANCELLED:
          // Release reserved inventory
          for (const item of order.items) {
            await productRepository.releaseInventory(
              item.productId.toString(),
              item.quantity
            );

            // Log transaction
            await inventoryTransactionRepo.logTransaction({
              productId: item.productId,
              type: TRANSACTION_TYPES.RETURN,
              quantity: item.quantity,
              orderId: order._id,
              notes: 'Order cancelled - inventory released',
              performedBy: 'SYSTEM'
            });
          }
          break;

        case ORDER_STATUS.DELIVERED:
          // Mark as completed
          await orderRepository.updateById(order._id, {
            completedAt: new Date()
          });

          // Update product sales stats
          for (const item of order.items) {
            await productRepository.updateSalesStats(
              item.productId.toString(),
              item.quantity,
              item.subtotal
            );
          }
          break;

        case ORDER_STATUS.SHIPPED:
          // Update shipping timestamp
          await orderRepository.updateById(order._id, {
            'shipping.shippedAt': new Date()
          });
          break;
      }
    } catch (error) {
      logger.warn('Error handling status change:', error.message);
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId, reason = '', cancelledBy = 'CUSTOMER') {
    try {
      const order = await orderRepository.findById(orderId);
      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      // Can only cancel if not shipped/delivered
      if ([ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED].includes(order.status)) {
        throw new BusinessLogicError('Cannot cancel shipped or delivered orders');
      }

      await this.updateOrderStatus(
        orderId,
        ORDER_STATUS.CANCELLED,
        reason,
        cancelledBy
      );

      await orderRepository.updateById(orderId, {
        cancelledAt: new Date()
      });

      logger.success(`Order ${order.orderNumber} cancelled`);
      return true;

    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Get user orders
   */
  async getUserOrders(userId, options = {}) {
    try {
      return await orderRepository.getOrdersByUser(userId, options);
    } catch (error) {
      logger.error('Error getting user orders:', error);
      throw error;
    }
  }

  /**
   * Search orders
   */
  async searchOrders(filters = {}) {
    try {
      return await orderRepository.searchOrders(filters);
    } catch (error) {
      logger.error('Error searching orders:', error);
      throw error;
    }
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status, options = {}) {
    try {
      return await orderRepository.getOrdersByStatus(status, options);
    } catch (error) {
      logger.error('Error getting orders by status:', error);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats() {
    try {
      return await orderRepository.getOrderStats();
    } catch (error) {
      logger.error('Error getting order stats:', error);
      throw error;
    }
  }

  /**
   * Get revenue by date range
   */
  async getRevenueByDateRange(startDate, endDate) {
    try {
      return await orderRepository.getRevenueByDateRange(startDate, endDate);
    } catch (error) {
      logger.error('Error getting revenue:', error);
      throw error;
    }
  }
}

module.exports = new OrderService();