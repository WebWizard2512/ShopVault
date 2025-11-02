/**
 * User Repository
 */

const BaseRepository = require('./BaseRepository');
const { COLLECTIONS } = require('../config/constants');
const logger = require('../utils/logger');

class UserRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.USERS);
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    try {
      return await this.findOne({ email: email.toLowerCase() });
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(userId, productId) {
    try {
      const collection = this.getCollection();
      
      await collection.updateOne(
        { _id: this.toObjectId(userId) },
        {
          $addToSet: {
            wishlist: {
              productId: this.toObjectId(productId),
              addedAt: new Date(),
              notes: ''
            }
          }
        }
      );

      return await this.findById(userId);
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
      const collection = this.getCollection();
      
      await collection.updateOne(
        { _id: this.toObjectId(userId) },
        {
          $pull: {
            wishlist: { productId: this.toObjectId(productId) }
          }
        }
      );

      return await this.findById(userId);
    } catch (error) {
      logger.error('Error removing from wishlist:', error);
      throw error;
    }
  }

  /**
   * Get user wishlist with product details
   */
  async getWishlistWithProducts(userId) {
    try {
      const pipeline = [
        {
          $match: { _id: this.toObjectId(userId) }
        },
        {
          $unwind: '$wishlist'
        },
        {
          $lookup: {
            from: COLLECTIONS.PRODUCTS,
            localField: 'wishlist.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: '$product'
        },
        {
          $project: {
            productId: '$wishlist.productId',
            addedAt: '$wishlist.addedAt',
            notes: '$wishlist.notes',
            product: 1
          }
        }
      ];

      return await this.aggregate(pipeline);
    } catch (error) {
      logger.error('Error getting wishlist with products:', error);
      throw error;
    }
  }
}

module.exports = new UserRepository();