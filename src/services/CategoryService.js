/**
 * Category Service
 * 
 * LEARNING NOTES:
 * Managing hierarchical data requires special care:
 * - Path calculation for breadcrumbs
 * - Level management for depth
 * - Cascading updates when moving categories
 * - Orphan prevention (can't delete parent with children)
 */

const categoryRepository = require('../repositories/CategoryRepository');
const { CategoryValidationSchema } = require('../models/Category');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError, BusinessLogicError } = require('../utils/errorHandler');

class CategoryService {
  /**
   * Create a new category
   */
  async createCategory(categoryData) {
    try {
      // Validate input
      const { error, value } = CategoryValidationSchema.validate(categoryData, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(d => d.message).join(', ');
        throw new ValidationError(`Validation failed: ${errors}`);
      }

      // Check if slug already exists
      const existingCategory = await categoryRepository.findBySlug(value.slug);
      if (existingCategory) {
        throw new BusinessLogicError(`Category with slug '${value.slug}' already exists`);
      }

      // If has parent, verify parent exists and calculate path/level
      let processedData = { ...value };
      
      if (value.parentId) {
        const parent = await categoryRepository.findById(value.parentId);
        if (!parent) {
          throw new ValidationError('Parent category does not exist');
        }

        processedData.level = parent.level + 1;
        processedData.path = parent.path ? `${parent.path} > ${value.name}` : value.name;
      } else {
        processedData.level = 0;
        processedData.path = value.name;
      }

      // Create category
      const category = await categoryRepository.create(processedData);

      logger.success(`Category created: ${category.name}`);
      return category;

    } catch (error) {
      logger.error('Error creating category:', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId) {
    try {
      const category = await categoryRepository.findById(categoryId);
      
      if (!category) {
        throw new NotFoundError('Category', categoryId);
      }

      return category;
    } catch (error) {
      logger.error('Error getting category:', error);
      throw error;
    }
  }

  /**
   * Get all root categories
   */
  async getRootCategories() {
    try {
      return await categoryRepository.getRootCategories();
    } catch (error) {
      logger.error('Error getting root categories:', error);
      throw error;
    }
  }

  /**
   * Get category with children
   */
  async getCategoryWithChildren(categoryId) {
    try {
      const category = await categoryRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundError('Category', categoryId);
      }

      const children = await categoryRepository.getChildren(categoryId);

      return {
        ...category,
        children
      };
    } catch (error) {
      logger.error('Error getting category with children:', error);
      throw error;
    }
  }

  /**
   * Get full category tree
   */
  async getCategoryTree() {
    try {
      return await categoryRepository.getCategoryTree();
    } catch (error) {
      logger.error('Error getting category tree:', error);
      throw error;
    }
  }

  /**
   * Update category
   */
  async updateCategory(categoryId, updateData) {
    try {
      const existingCategory = await categoryRepository.findById(categoryId);
      if (!existingCategory) {
        throw new NotFoundError('Category', categoryId);
      }

      // If slug is being updated, check uniqueness
      if (updateData.slug && updateData.slug !== existingCategory.slug) {
        const slugExists = await categoryRepository.findBySlug(updateData.slug);
        if (slugExists) {
          throw new BusinessLogicError(`Slug '${updateData.slug}' is already in use`);
        }
      }

      // If name is updated and has children, update their paths
      if (updateData.name && updateData.name !== existingCategory.name) {
        await this.updateChildrenPaths(categoryId, updateData.name);
      }

      // Update category
      const updatedCategory = await categoryRepository.updateById(categoryId, updateData);

      logger.success(`Category updated: ${updatedCategory.name}`);
      return updatedCategory;

    } catch (error) {
      logger.error('Error updating category:', error);
      throw error;
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId) {
    try {
      const category = await categoryRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundError('Category', categoryId);
      }

      // Check if category has children
      const children = await categoryRepository.getChildren(categoryId);
      if (children.length > 0) {
        throw new BusinessLogicError(
          'Cannot delete category with children. Delete or move children first.'
        );
      }

      // Check if category has products
      if (category.productCount > 0) {
        throw new BusinessLogicError(
          `Cannot delete category with ${category.productCount} products. Move or delete products first.`
        );
      }

      // Soft delete
      await categoryRepository.softDelete(categoryId);

      logger.success(`Category deleted: ${category.name}`);
      return true;

    } catch (error) {
      logger.error('Error deleting category:', error);
      throw error;
    }
  }

  /**
   * Move category to new parent
   */
  async moveCategory(categoryId, newParentId) {
    try {
      const category = await categoryRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundError('Category', categoryId);
      }

      // Can't move to itself
      if (categoryId === newParentId) {
        throw new BusinessLogicError('Cannot move category to itself');
      }

      // Can't move to one of its descendants
      if (newParentId) {
        const descendants = await categoryRepository.getDescendants(categoryId);
        const isDescendant = descendants.some(d => d._id.toString() === newParentId);
        
        if (isDescendant) {
          throw new BusinessLogicError('Cannot move category to one of its descendants');
        }
      }

      // Perform move
      await categoryRepository.moveCategory(categoryId, newParentId);

      logger.success(`Category moved successfully`);
      return await categoryRepository.findById(categoryId);

    } catch (error) {
      logger.error('Error moving category:', error);
      throw error;
    }
  }

  /**
   * Search categories
   */
  async searchCategories(searchTerm) {
    try {
      return await categoryRepository.searchByName(searchTerm);
    } catch (error) {
      logger.error('Error searching categories:', error);
      throw error;
    }
  }

  /**
   * Update product count for category
   */
  async updateProductCount(categoryId) {
    try {
      return await categoryRepository.updateProductCount(categoryId);
    } catch (error) {
      logger.error('Error updating product count:', error);
      throw error;
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStats() {
    try {
      const allCategories = await categoryRepository.findMany({ isActive: true });
      const rootCategories = await categoryRepository.getRootCategories();

      return {
        total: allCategories.length,
        rootCategories: rootCategories.length,
        totalProducts: allCategories.reduce((sum, cat) => sum + (cat.productCount || 0), 0)
      };
    } catch (error) {
      logger.error('Error getting category stats:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Update paths for all children when parent name changes
   */
  async updateChildrenPaths(categoryId, newName) {
    try {
      const category = await categoryRepository.findById(categoryId);
      const children = await categoryRepository.getDescendants(categoryId);

      for (const child of children) {
        const oldPath = child.path;
        const newPath = oldPath.replace(category.name, newName);
        await categoryRepository.updateById(child._id, { path: newPath });
      }
    } catch (error) {
      logger.warn('Error updating children paths:', error.message);
    }
  }
}

module.exports = new CategoryService();