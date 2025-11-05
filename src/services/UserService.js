/**
 * User Service
 * 
 * LEARNING NOTES:
 * User management with embedded wishlists
 * - Wishlist uses $addToSet to prevent duplicates
 * - Aggregation to join wishlist products
 * - Password should be hashed in production (bcrypt)
 */

const userRepository = require('../repositories/UserRepository');
const productRepository = require('../repositories/ProductRepository');
const { UserValidationSchema } = require('../models/User');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError, BusinessLogicError } = require('../utils/errorHandler');

class UserService {
  /**
   * Create new user
   */
  async createUser(userData) {
    try {
      // Validate input
      const { error, value } = UserValidationSchema.validate(userData, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(d => d.message).join(', ');
        throw new ValidationError(`Validation failed: ${errors}`);
      }

      // Check if email already exists
      const existingUser = await userRepository.findByEmail(value.email);
      if (existingUser) {
        throw new BusinessLogicError(`User with email '${value.email}' already exists`);
      }

      // In production: hash password with bcrypt
      // value.password = await bcrypt.hash(value.password, 10);

      // Create user
      const user = await userRepository.create(value);

      logger.success(`User created: ${user.email}`);
      
      // Don't return password
      delete user.password;
      return user;

    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const user = await userRepository.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User', userId);
      }

      // Don't return password
      delete user.password;
      return user;

    } catch (error) {
      logger.error('Error getting user:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    try {
      const user = await userRepository.findByEmail(email);
      
      if (!user) {
        throw new NotFoundError('User', email);
      }

      delete user.password;
      return user;

    } catch (error) {
      logger.error('Error getting user by email:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData) {
    try {
      const existingUser = await userRepository.findById(userId);
      if (!existingUser) {
        throw new NotFoundError('User', userId);
      }

      // If email is being updated, check uniqueness
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await userRepository.findByEmail(updateData.email);
        if (emailExists) {
          throw new BusinessLogicError(`Email '${updateData.email}' is already in use`);
        }
      }

      // Don't allow updating wishlist through this method
      delete updateData.wishlist;

      const updatedUser = await userRepository.updateById(userId, updateData);

      logger.success(`User updated: ${updatedUser.email}`);
      
      delete updatedUser.password;
      return updatedUser;

    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User', userId);
      }

      await userRepository.softDelete(userId);

      logger.success(`User deleted: ${user.email}`);
      return true;

    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(userId, productId, notes = '') {
    try {
      // Verify user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User', userId);
      }

      // Verify product exists
      const product = await productRepository.findById(productId);
      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      // Check if already in wishlist
      const alreadyInWishlist = user.wishlist.some(
        item => item.productId.toString() === productId.toString()
      );

      if (alreadyInWishlist) {
        throw new BusinessLogicError('Product is already in wishlist');
      }

      // Add to wishlist
      const updatedUser = await userRepository.addToWishlist(userId, productId);

      logger.success(`Added ${product.name} to wishlist`);
      return updatedUser;

    } catch (error) {
      logger.error('Error adding to wishlist:', error);
      throw error;
    }
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(userId, productId) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User', userId);
      }

      const updatedUser = await userRepository.removeFromWishlist(userId, productId);

      logger.success('Removed from wishlist');
      return updatedUser;

    } catch (error) {
      logger.error('Error removing from wishlist:', error);
      throw error;
    }
  }

  /**
   * Get wishlist with product details
   */
  async getWishlistWithProducts(userId) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User', userId);
      }

      const wishlistItems = await userRepository.getWishlistWithProducts(userId);

      return wishlistItems;

    } catch (error) {
      logger.error('Error getting wishlist:', error);
      throw error;
    }
  }

  /**
   * Search users
   */
  async searchUsers(filters = {}) {
    try {
      const { email = '', role = null, page = 1, limit = 10 } = filters;

      const query = { deletedAt: null };

      if (email) {
        query.email = new RegExp(email, 'i');
      }

      if (role) {
        query.role = role;
      }

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        userRepository.findMany(query, { 
          sort: { createdAt: -1 }, 
          limit, 
          skip,
          projection: { password: 0 } // Exclude passwords
        }),
        userRepository.count(query)
      ]);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Update user order statistics
   */
  async updateOrderStats(userId, orderAmount) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) return;

      const newStats = {
        'orderStats.totalOrders': (user.orderStats?.totalOrders || 0) + 1,
        'orderStats.totalSpent': (user.orderStats?.totalSpent || 0) + orderAmount,
        'orderStats.lastOrderDate': new Date()
      };

      await userRepository.updateById(userId, newStats);

    } catch (error) {
      logger.warn('Error updating user order stats:', error.message);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    try {
      const allUsers = await userRepository.findMany({ deletedAt: null });

      const stats = {
        totalUsers: allUsers.length,
        totalCustomers: allUsers.filter(u => u.role === 'CUSTOMER').length,
        totalAdmins: allUsers.filter(u => u.role === 'ADMIN').length,
        verifiedUsers: allUsers.filter(u => u.isVerified).length,
        activeUsers: allUsers.filter(u => u.isActive).length
      };

      return stats;

    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }
}

module.exports = new UserService();