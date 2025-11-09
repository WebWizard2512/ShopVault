const BaseRepository = require('./BaseRepository');
const { COLLECTIONS } = require('../config/constants');
const { ObjectId } = require('mongodb');
const logger = require('../utils/logger');

class CategoryRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.CATEGORIES);
  }

  async findBySlug(slug) {
    try {
      return await this.findOne({ slug: slug.toLowerCase() });
    } catch (error) {
      logger.error('Error finding category by slug:', error);
      throw error;
    }
  }

  async getRootCategories() {
    try {
      return await this.findMany(
        { parentId: null, isActive: true },
        { sort: { order: 1, name: 1 } }
      );
    } catch (error) {
      logger.error('Error getting root categories:', error);
      throw error;
    }
  }

  async getChildren(parentId) {
    try {
      const filter = {
        parentId: parentId ? this.toObjectId(parentId) : null,
        isActive: true
      };
      
      return await this.findMany(filter, { sort: { order: 1, name: 1 } });
    } catch (error) {
      logger.error('Error getting category children:', error);
      throw error;
    }
  }

  async getDescendants(categoryId) {
    try {
      const category = await this.findById(categoryId);
      if (!category) return [];

      const pathRegex = new RegExp(`^${category.path}`);
      
      return await this.findMany(
        { 
          path: pathRegex,
          _id: { $ne: this.toObjectId(categoryId) },
          isActive: true
        },
        { sort: { level: 1, order: 1 } }
      );
    } catch (error) {
      logger.error('Error getting descendants:', error);
      throw error;
    }
  }

  async getCategoryTree() {
    try {
      const allCategories = await this.findMany(
        { isActive: true },
        { sort: { level: 1, order: 1, name: 1 } }
      );

      const categoryMap = new Map();
      const roots = [];

      allCategories.forEach(cat => {
        categoryMap.set(cat._id.toString(), { ...cat, children: [] });
      });

      allCategories.forEach(cat => {
        const node = categoryMap.get(cat._id.toString());
        
        if (!cat.parentId) {
          roots.push(node);
        } else {
          const parent = categoryMap.get(cat.parentId.toString());
          if (parent) {
            parent.children.push(node);
          }
        }
      });

      return roots;
    } catch (error) {
      logger.error('Error building category tree:', error);
      throw error;
    }
  }

  async updateProductCount(categoryId) {
    try {
      const db = this.getCollection().s.db;
      const count = await db.collection(COLLECTIONS.PRODUCTS).countDocuments({
        categoryId: this.toObjectId(categoryId),
        isActive: true,
        deletedAt: null
      });

      await this.updateById(categoryId, { productCount: count });
      return count;
    } catch (error) {
      logger.error('Error updating product count:', error);
      throw error;
    }
  }
}

module.exports = new CategoryRepository();