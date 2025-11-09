const categoryRepository = require('../repositories/CategoryRepository');
const { CategoryValidationSchema } = require('../models/Category');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError, BusinessLogicError } = require('../utils/errorHandler');

class CategoryService {
  async createCategory(categoryData) {
    try {
      const { error, value } = CategoryValidationSchema.validate(categoryData, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(d => d.message).join(', ');
        throw new ValidationError(`Validation failed: ${errors}`);
      }

      const existingCategory = await categoryRepository.findBySlug(value.slug);
      if (existingCategory) {
        throw new BusinessLogicError(`Category with slug '${value.slug}' already exists`);
      }

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

      const category = await categoryRepository.create(processedData);

      logger.success(`Category created: ${category.name}`);
      return category;

    } catch (error) {
      logger.error('Error creating category:', error);
      throw error;
    }
  }

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

  async getRootCategories() {
    try {
      return await categoryRepository.getRootCategories();
    } catch (error) {
      logger.error('Error getting root categories:', error);
      throw error;
    }
  }

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

  async getCategoryTree() {
    try {
      return await categoryRepository.getCategoryTree();
    } catch (error) {
      logger.error('Error getting category tree:', error);
      throw error;
    }
  }

  async updateCategory(categoryId, updateData) {
    try {
      const existingCategory = await categoryRepository.findById(categoryId);
      if (!existingCategory) {
        throw new NotFoundError('Category', categoryId);
      }

      if (updateData.slug && updateData.slug !== existingCategory.slug) {
        const slugExists = await categoryRepository.findBySlug(updateData.slug);
        if (slugExists) {
          throw new BusinessLogicError(`Slug '${updateData.slug}' is already in use`);
        }
      }

      if (updateData.name && updateData.name !== existingCategory.name) {
        await this.updateChildrenPaths(categoryId, updateData.name);
      }

      const updatedCategory = await categoryRepository.updateById(categoryId, updateData);

      logger.success(`Category updated: ${updatedCategory.name}`);
      return updatedCategory;

    } catch (error) {
      logger.error('Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(categoryId) {
    try {
      const category = await categoryRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundError('Category', categoryId);
      }

      const children = await categoryRepository.getChildren(categoryId);
      if (children.length > 0) {
        throw new BusinessLogicError(
          'Cannot delete category with children. Delete or move children first.'
        );
      }

      if (category.productCount > 0) {
        throw new BusinessLogicError(
          `Cannot delete category with ${category.productCount} products. Move or delete products first.`
        );
      }

      await categoryRepository.softDelete(categoryId);

      logger.success(`Category deleted: ${category.name}`);
      return true;

    } catch (error) {
      logger.error('Error deleting category:', error);
      throw error;
    }
  }

  async searchCategories(searchTerm) {
    try {
      const regex = new RegExp(searchTerm, 'i');
      return await categoryRepository.findMany(
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

  async updateProductCount(categoryId) {
    try {
      return await categoryRepository.updateProductCount(categoryId);
    } catch (error) {
      logger.error('Error updating product count:', error);
      throw error;
    }
  }

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