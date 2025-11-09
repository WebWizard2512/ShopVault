const productRepository = require('../repositories/ProductRepository');
const { ProductValidationSchema } = require('../models/Product');
const { PRODUCT_STATUS, COLLECTIONS } = require('../config/constants');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError, BusinessLogicError } = require('../utils/errorHandler');
const dbManager = require('../config/database');
const { ObjectId } = require('mongodb');

class ProductService {
  async createProduct(productData) {
    try {
      const { error, value } = ProductValidationSchema.validate(productData, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(d => d.message).join(', ');
        throw new ValidationError(`Validation failed: ${errors}`);
      }

      const existingProduct = await productRepository.findBySku(value.sku);
      if (existingProduct) {
        throw new BusinessLogicError(`Product with SKU '${value.sku}' already exists`);
      }

      const categoryExists = await this.verifyCategoryExists(value.categoryId);
      if (!categoryExists) {
        throw new ValidationError(`Category with ID '${value.categoryId}' does not exist`);
      }

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
        seo: {
          ...value.seo,
          slug: value.seo?.slug || this.generateSlug(value.name)
        },
        salesStats: {
          totalSold: 0,
          revenue: 0,
          lastSoldAt: null
        },
        ratings: {
          average: 0,
          count: 0
        }
      };

      processedData.status = processedData.inventory.available > 0 
        ? PRODUCT_STATUS.AVAILABLE 
        : PRODUCT_STATUS.OUT_OF_STOCK;

      const product = await productRepository.create(processedData);

      logger.success(`Product created: ${product.name} (SKU: ${product.sku})`);
      return product;

    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  async getProductById(productId) {
    try {
      const product = await productRepository.findById(productId);
      
      if (!product) {
        throw new NotFoundError('Product', productId);
      }

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

  async updateProduct(productId, updateData) {
    try {
      const existingProduct = await productRepository.findById(productId);
      if (!existingProduct) {
        throw new NotFoundError('Product', productId);
      }

      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const skuExists = await productRepository.findBySku(updateData.sku);
        if (skuExists) {
          throw new BusinessLogicError(`SKU '${updateData.sku}' is already in use`);
        }
      }

      if (updateData.categoryId) {
        const categoryExists = await this.verifyCategoryExists(updateData.categoryId);
        if (!categoryExists) {
          throw new ValidationError(`Category with ID '${updateData.categoryId}' does not exist`);
        }
        updateData.categoryId = new ObjectId(updateData.categoryId);
      }

      if (updateData.inventory) {
        updateData.inventory.available = 
          (updateData.inventory.quantity || existingProduct.inventory.quantity) - 
          (existingProduct.inventory.reserved || 0);
        
        updateData.status = updateData.inventory.available > 0 
          ? PRODUCT_STATUS.AVAILABLE 
          : PRODUCT_STATUS.OUT_OF_STOCK;
      }

      if (updateData.name && !updateData.seo?.slug) {
        updateData.seo = {
          ...existingProduct.seo,
          slug: this.generateSlug(updateData.name)
        };
      }

      const updatedProduct = await productRepository.updateById(productId, updateData);

      logger.success(`Product updated: ${updatedProduct.name}`);
      return updatedProduct;

    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(productId) {
    try {
      const product = await productRepository.findById(productId);
      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      const deletedProduct = await productRepository.softDelete(productId);

      logger.success(`Product deleted: ${product.name}`);
      return deletedProduct;

    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }

  async searchProducts(filters) {
    try {
      const result = await productRepository.search(filters);
      return result;

    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  async getProductsWithCategories(filters = {}, options = {}) {
    try {
      return await productRepository.getProductsWithCategory(filters, options);
    } catch (error) {
      logger.error('Error getting products with categories:', error);
      throw error;
    }
  }

  async addStock(productId, quantity, reason = 'RESTOCK') {
    try {
      if (quantity <= 0) {
        throw new ValidationError('Quantity must be positive');
      }

      const product = await productRepository.updateInventory(productId, quantity);
      
      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      await this.logInventoryTransaction(productId, quantity, 'PURCHASE', reason);

      logger.success(`Added ${quantity} units to ${product.name}`);
      return product;

    } catch (error) {
      logger.error('Error adding stock:', error);
      throw error;
    }
  }

  async removeStock(productId, quantity, reason = 'SALE') {
    try {
      if (quantity <= 0) {
        throw new ValidationError('Quantity must be positive');
      }

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

      await this.logInventoryTransaction(productId, quantity, 'SALE', reason);

      logger.success(`Removed ${quantity} units from ${product.name}`);
      return updatedProduct;

    } catch (error) {
      logger.error('Error removing stock:', error);
      throw error;
    }
  }

  async getLowStockProducts(threshold = 10) {
    try {
      return await productRepository.getLowStockProducts(threshold);
    } catch (error) {
      logger.error('Error getting low stock products:', error);
      throw error;
    }
  }

  async getOutOfStockProducts() {
    try {
      return await productRepository.getOutOfStockProducts();
    } catch (error) {
      logger.error('Error getting out of stock products:', error);
      throw error;
    }
  }

  async getTopSellers(limit = 10) {
    try {
      return await productRepository.getTopSellers(limit);
    } catch (error) {
      logger.error('Error getting top sellers:', error);
      throw error;
    }
  }

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

  generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

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