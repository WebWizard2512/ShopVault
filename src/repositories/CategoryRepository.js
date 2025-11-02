/**
 * Category Repository
 * 
 * LEARNING NOTES - HIERARCHICAL DATA QUERIES:
 * 
 * Working with tree structures in MongoDB:
 * - Parent Reference: Store parent ID in each node
 * - Path: Store full path for quick breadcrumb
 * - Level: Store depth for filtering
 * 
 * Common queries:
 * - Get all children: filter by parentId
 * - Get all descendants: filter by path (regex)
 * - Get siblings: same parentId
 * - Get ancestors: parse path and fetch
 */

const BaseRepository = require('./BaseRepository');
const { COLLECTIONS } = require('../config/constants');
const { ObjectId } = require('mongodb');
const logger = require('../utils/logger');

class CategoryRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.CATEGORIES);
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug) {
    try {
      return await this.findOne({ slug: slug.toLowerCase() });
    } catch (error) {
      logger.error('Error finding category by slug:', error);
      throw error;
    }
  }

  /**
   * Get all root categories (no parent)
   */
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

  /**
   * Get children of a category
   */
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

  /**
   * Get all descendants of a category (recursive)
   * Uses path field for efficient querying
   */
  async getDescendants(categoryId) {
    try {
      const category = await this.findById(categoryId);
      if (!category) return [];

      // Find all categories whose path starts with this category's path
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

  /**
   * Get category tree (all categories organized hierarchically)
   */
  async getCategoryTree() {
    try {
      const allCategories = await this.findMany(
        { isActive: true },
        { sort: { level: 1, order: 1, name: 1 } }
      );

      // Build tree structure
      const categoryMap = new Map();
      const roots = [];

      // First pass: create map
      allCategories.forEach(cat => {
        categoryMap.set(cat._id.toString(), { ...cat, children: [] });
      });

      // Second pass: build tree
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

  /**
   * Update product count for a category
   */
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

  /**
   * Search categories by name
   */
  async searchByName(searchTerm) {
    try {
      const regex = new RegExp(searchTerm, 'i');
      return await this.findMany(
        {
          name: regex,
          isActive: true
        },
        { sort: { name: 1 } }
      );
    } catch (error) {
      logger.error('Error searching categories:', error);
      throw error;
    }
  }

  /**
   * Get categories by level
   */
  async getCategoriesByLevel(level) {
    try {
      return await this.findMany(
        { level, isActive: true },
        { sort: { order: 1, name: 1 } }
      );
    } catch (error) {
      logger.error('Error getting categories by level:', error);
      throw error;
    }
  }

  /**
   * Move category to new parent
   */
  async moveCategory(categoryId, newParentId) {
    try {
      const category = await this.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Get new parent (if any)
      const newParent = newParentId ? await this.findById(newParentId) : null;

      // Calculate new level and path
      const newLevel = newParent ? newParent.level + 1 : 0;
      const newPath = newParent ? `${newParent.path}/${category.name}` : category.name;

      // Update category
      await this.updateById(categoryId, {
        parentId: newParentId ? this.toObjectId(newParentId) : null,
        level: newLevel,
        path: newPath
      });

      // Update all descendants' paths
      await this.updateDescendantPaths(categoryId, newPath);

      logger.success(`Category moved successfully`);
      return await this.findById(categoryId);

    } catch (error) {
      logger.error('Error moving category:', error);
      throw error;
    }
  }

  /**
   * Update paths for all descendants after a category move
   */
  async updateDescendantPaths(categoryId, newParentPath) {
    try {
      const descendants = await this.getDescendants(categoryId);
      const category = await this.findById(categoryId);

      for (const desc of descendants) {
        // Replace old path with new path
        const relativePath = desc.path.replace(category.path, '');
        const newPath = `${newParentPath}${relativePath}`;

        await this.updateById(desc._id, { path: newPath });
      }
    } catch (error) {
      logger.error('Error updating descendant paths:', error);
      throw error;
    }
  }
}

module.exports = new CategoryRepository();