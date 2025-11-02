/**
 * Application Constants
 * 
 * LEARNING NOTES:
 * - Centralized constants = Easy maintenance, no magic strings
 * - These define business rules and will be used throughout the app
 */

module.exports = {
  // Collection Names
  COLLECTIONS: {
    PRODUCTS: 'products',
    CATEGORIES: 'categories',
    USERS: 'users',
    ORDERS: 'orders',
    WISHLISTS: 'wishlists',
    INVENTORY_TRANSACTIONS: 'inventory_transactions',
    ANALYTICS: 'analytics'
  },

  // Order Status Workflow
  ORDER_STATUS: {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    PROCESSING: 'PROCESSING',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    REFUNDED: 'REFUNDED'
  },

  // Product Availability
  PRODUCT_STATUS: {
    AVAILABLE: 'AVAILABLE',
    OUT_OF_STOCK: 'OUT_OF_STOCK',
    DISCONTINUED: 'DISCONTINUED',
    COMING_SOON: 'COMING_SOON'
  },

  // Inventory Transaction Types
  TRANSACTION_TYPES: {
    PURCHASE: 'PURCHASE',        // Stock added via purchase
    SALE: 'SALE',                // Stock reduced via sale
    RETURN: 'RETURN',            // Stock added via return
    ADJUSTMENT: 'ADJUSTMENT',    // Manual adjustment
    DAMAGED: 'DAMAGED',          // Stock removed due to damage
    RESTOCK: 'RESTOCK'           // Stock added via restock
  },

  // User Roles
  USER_ROLES: {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    CUSTOMER: 'CUSTOMER'
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },

  // Inventory Thresholds
  INVENTORY: {
    LOW_STOCK_THRESHOLD: 10,
    CRITICAL_STOCK_THRESHOLD: 5,
    REORDER_QUANTITY: 50
  },

  // Price Validation
  PRICE: {
    MIN_PRICE: 0.01,
    MAX_PRICE: 999999.99
  },

  // Analytics Time Periods
  ANALYTICS_PERIODS: {
    TODAY: 'TODAY',
    WEEK: 'WEEK',
    MONTH: 'MONTH',
    QUARTER: 'QUARTER',
    YEAR: 'YEAR',
    CUSTOM: 'CUSTOM'
  },

  // Error Messages
  ERRORS: {
    DB_CONNECTION_FAILED: 'Failed to connect to database',
    PRODUCT_NOT_FOUND: 'Product not found',
    CATEGORY_NOT_FOUND: 'Category not found',
    USER_NOT_FOUND: 'User not found',
    ORDER_NOT_FOUND: 'Order not found',
    INSUFFICIENT_STOCK: 'Insufficient stock available',
    INVALID_INPUT: 'Invalid input provided',
    DUPLICATE_ENTRY: 'Entry already exists',
    OPERATION_FAILED: 'Operation failed'
  },

  // Success Messages
  SUCCESS: {
    PRODUCT_CREATED: 'Product created successfully',
    PRODUCT_UPDATED: 'Product updated successfully',
    PRODUCT_DELETED: 'Product deleted successfully',
    ORDER_CREATED: 'Order created successfully',
    ORDER_UPDATED: 'Order status updated successfully'
  }
};