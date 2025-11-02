/**
 * Product Service - Business Logic Layer
 * 
 * LEARNING NOTES - SERVICE LAYER PATTERN:
 * 
 * Why Service Layer?
 * - Repositories = Data access (HOW to get data)
 * - Services = Business logic (WHAT to do with data)
 * - Controllers/CLI = User interface (User interaction)
 * 
 * This separation makes code:
 * - Testable (mock repositories)
 * - Reusable (same service for CLI, API, etc.)
 * - Maintainable (change business rules in one place)
 */

const productRepository = require('../repositories/ProductRepository');
const { ProductValidationSchema } = require('../models/Product');
const { PRODUCT_STATUS, COLLECTIONS } = require('../config/constants');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError, BusinessLogicError } = require('../utils/errorHandler');
const dbManager = require('../config/database');
const { ObjectId } = require('mongodb');

class ProductService {
  /**
   * Create a new product with validation
   */
  async createProduct(productData) {
    try {
      // Step 1: Validate input
      const { error, value } = ProductValidationSchema.validate(productData, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(d => d.message).join(', ');
        throw new ValidationError(`Validation failed: ${errors}`);
      }

      // Step 2: Check if SKU already exists
      const existingProduct = await productRepository.findBySku(value.sku);
      if (existingProduct) {
        throw new BusinessLogicError(`Product with SKU '${value.sku}' already exists`);
      }

      // Step 3: Verify category exists
      const categoryExists = await this.verifyCategoryExists(value.categoryId);
      if (!categoryExists) {
        throw new ValidationError(`Category with ID '${value.categoryId}' does not exist`);
      }

      // Step 4: Process inventory data
      const processedData = {
        ...value,
        categoryId: new ObjectId(value.categoryId),
        inventory: {
          quantity: value.inventory?.quantity || 0,
          reserved: 0,
          available: value.inventory?.quantity || 0,
          reorderPoint: value.inventory?.reorderPoint || 10,
          reorderQuantity: value.inventory?.reorderQuantity || 50
        },
        // Auto-generate slug from name
        seo: {
          ...value.seo,
          slug: value.seo?.slug || this.generateSlug(value.name)
        },
        // Initialize sales stats
        salesStats: {
          totalSold: 0,
          revenue: 0,
          lastSoldAt: null
        },
        // Initialize ratings
        ratings: {
          average: 0,
          count: 0
        }
      };

      // Step 5: Determine status based on inventory
      processedData.status = processedData.inventory.available > 0 
        ? PRODUCT_STATUS.AVAILABLE 
        : PRODUCT_STATUS.OUT_OF_STOCK;

      // Step 6: Create product
      const product = await productRepository.create(processedData);

      logger.success(`Product created: ${product.name} (SKU: ${product.sku})`);
      return product;

    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Get product by ID with category details
   */
  async getProductById(productId) {
    try {
      const product = await productRepository.findById(productId);
      
      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      // Fetch category details
      const category = await this.getCategoryById(product.categoryId);
      
      return {
        ...product,
        category: category || null
      };

    } catch (error) {
      logger.error('Error getting product:', error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId, updateData) {
    try {
      // Step 1: Check product exists
      const existingProduct = await productRepository.findById(productId);
      if (!existingProduct) {
        throw new NotFoundError('Product', productId);
      }

      // Step 2: If SKU is being updated, check uniqueness
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const skuExists = await productRepository.findBySku(updateData.sku);
        if (skuExists) {
          throw new BusinessLogicError(`SKU '${updateData.sku}' is already in use`);
        }
      }

      // Step 3: If category is being updated, verify it exists
      if (updateData.categoryId) {
        const categoryExists = await this.verifyCategoryExists(updateData.categoryId);
        if (!categoryExists) {
          throw new ValidationError(`Category with ID '${updateData.categoryId}' does not exist`);
        }
        updateData.categoryId = new ObjectId(updateData.categoryId);
      }

      // Step 4: If inventory is updated, recalculate available
      if (updateData.inventory) {
        updateData.inventory.available = 
          (updateData.inventory.quantity || existingProduct.inventory.quantity) - 
          (existingProduct.inventory.reserved || 0);
        
        // Update status based on availability
        updateData.status = updateData.inventory.available > 0 
          ? PRODUCT_STATUS.AVAILABLE 
          : PRODUCT_STATUS.OUT_OF_STOCK;
      }

      // Step 5: Update slug if name changed
      if (updateData.name && !updateData.seo?.slug) {
        updateData.seo = {
          ...existingProduct.seo,
          slug: this.generateSlug(updateData.name)
        };
      }

      // Step 6: Perform update
      const updatedProduct = await productRepository.updateById(productId, updateData);

      logger.success(`Product updated: ${updatedProduct.name}`);
      return updatedProduct;

    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(productId) {
    try {
      const product = await productRepository.findById(productId);
      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      // Soft delete
      const deletedProduct = await productRepository.softDelete(productId);

      logger.success(`Product deleted: ${product.name}`);
      return deletedProduct;

    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Search products with advanced filters
   */
  async searchProducts(filters) {
    try {
      const result = await productRepository.search(filters);
      
      logger.info(`Found ${result.total} products matching search criteria`);
      return result;

    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get products with category details (using aggregation)
   */
  async getProductsWithCategories(filters = {}, options = {}) {
    try {
      const products = await productRepository.getProductsWithCategory(filters, options);
      return products;
    } catch (error) {
      logger.error('Error getting products with categories:', error);
      throw error;
    }
  }

  /**
   * Add stock to product
   */
  async addStock(productId, quantity, reason = 'RESTOCK') {
    try {
      if (quantity <= 0) {
        throw new ValidationError('Quantity must be positive');
      }

      const product = await productRepository.updateInventory(productId, quantity);
      
      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      // Log inventory transaction
      await this.logInventoryTransaction(productId, quantity, 'PURCHASE', reason);

      logger.success(`Added ${quantity} units to ${product.name}`);
      return product;

    } catch (error) {
      logger.error('Error adding stock:', error);
      throw error;
    }
  }

  /**
   * Remove stock from product
   */
  async removeStock(productId, quantity, reason = 'SALE') {
    try {
      if (quantity <= 0) {
        throw new ValidationError('Quantity must be positive');
      }

      // Check if enough stock
      const product = await productRepository.findById(productId);
      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      if (product.inventory.available < quantity) {
        throw new BusinessLogicError(
          `Insufficient stock. Available: ${product.inventory.available}, Requested: ${quantity}`
        );
      }

      const updatedProduct = await productRepository.updateInventory(productId, -quantity);

      // Log inventory transaction
      await this.logInventoryTransaction(productId, quantity, 'SALE', reason);

      logger.success(`Removed ${quantity} units from ${product.name}`);
      return updatedProduct;

    } catch (error) {
      logger.error('Error removing stock:', error);
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(threshold = 10) {
    try {
      const products = await productRepository.getLowStockProducts(threshold);
      logger.info(`Found ${products.length} low stock products`);
      return products;
    } catch (error) {
      logger.error('Error getting low stock products:', error);
      throw error;
    }
  }

  /**
   * Get out of stock products
   */
  async getOutOfStockProducts() {
    try {
      const products = await productRepository.getOutOfStockProducts();
      logger.info(`Found ${products.length} out of stock products`);
      return products;
    } catch (error) {
      logger.error('Error getting out of stock products:', error);
      throw error;
    }
  }

  /**
   * Get top selling products
   */
  async getTopSellers(limit = 10) {
    try {
      const products = await productRepository.getTopSellers(limit);
      return products;
    } catch (error) {
      logger.error('Error getting top sellers:', error);
      throw error;
    }
  }

  /**
   * Bulk price update
   */
  async bulkPriceUpdate(categoryId, percentage) {
    try {
      const filter = { categoryId: new ObjectId(categoryId) };
      const count = await productRepository.bulkPriceUpdate(filter, percentage);
      
      logger.success(`Updated prices for ${count} products by ${percentage}%`);
      return count;

    } catch (error) {
      logger.error('Error in bulk price update:', error);
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  async getProductStats() {
    try {
      const db = dbManager.getDb();
      const collection = db.collection(COLLECTIONS.PRODUCTS);

      const stats = await collection.aggregate([
        {
          $match: { isActive: true, deletedAt: null }
        },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$price', '$inventory.quantity'] } },
            averagePrice: { $avg: '$price' },
            totalInventory: { $sum: '$inventory.quantity' },
            totalSold: { $sum: '$salesStats.totalSold' },
            totalRevenue: { $sum: '$salesStats.revenue' }
          }
        }
      ]).toArray();

      return stats[0] || {};

    } catch (error) {
      logger.error('Error getting product stats:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate URL-friendly slug
   */
  generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Verify category exists
   */
  async verifyCategoryExists(categoryId) {
    try {
      const db = dbManager.getDb();
      const count = await db.collection(COLLECTIONS.CATEGORIES).countDocuments({
        _id: new ObjectId(categoryId)
      });
      return count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId) {
    try {
      const db = dbManager.getDb();
      return await db.collection(COLLECTIONS.CATEGORIES).findOne({
        _id: new ObjectId(categoryId)
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Log inventory transaction
   */
  async logInventoryTransaction(productId, quantity, type, notes = '') {
    try {
      const db = dbManager.getDb();
      await db.collection(COLLECTIONS.INVENTORY_TRANSACTIONS).insertOne({
        productId: new ObjectId(productId),
        quantity,
        type,
        notes,
        createdAt: new Date()
      });
    } catch (error) {
      logger.warn('Failed to log inventory transaction:', error.message);
    }
  }
}

module.exports = new ProductService();