/**
 * Base Repository Pattern
 * 
 * LEARNING NOTES - REPOSITORY PATTERN:
 * 
 * 1. WHY REPOSITORY PATTERN?
 *    - Abstracts database operations
 *    - Single Responsibility: One class = One collection
 *    - Makes testing easier (can mock repositories)
 *    - Consistent error handling across all operations
 * 
 * 2. GENERIC METHODS:
 *    - create, findById, findOne, findMany, update, delete
 *    - Every specific repository inherits these
 *    - Reduces code duplication by 80%!
 * 
 * 3. MONGODB BEST PRACTICES:
 *    - Always use ObjectId conversion
 *    - Handle errors consistently
 *    - Return null (not error) for not found
 *    - Use projection to limit fields returned
 */

const { ObjectId } = require('mongodb');
const dbManager = require('../config/database');
const logger = require('../utils/logger');
const { NotFoundError, DatabaseError, parseMongoError } = require('../utils/errorHandler');

class BaseRepository {
  /**
   * Constructor
   * @param {string} collectionName - MongoDB collection name
   */
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  /**
   * Get collection instance
   */
  getCollection() {
    return dbManager.getCollection(this.collectionName);
  }

  /**
   * Convert string to ObjectId safely
   */
  toObjectId(id) {
    try {
      if (id instanceof ObjectId) return id;
      if (typeof id === 'string' && ObjectId.isValid(id)) {
        return new ObjectId(id);
      }
      throw new Error('Invalid ObjectId format');
    } catch (error) {
      throw new Error(`Invalid ID format: ${id}`);
    }
  }

  /**
   * CREATE - Insert single document
   * @param {Object} data - Document to insert
   * @returns {Object} Inserted document with _id
   */
  async create(data) {
    try {
      const collection = this.getCollection();
      
      // Add timestamps
      const document = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await collection.insertOne(document);
      
      logger.debug(`Created document in ${this.collectionName}: ${result.insertedId}`);
      
      return {
        _id: result.insertedId,
        ...document
      };
    } catch (error) {
      logger.error(`Error creating document in ${this.collectionName}:`, error);
      throw parseMongoError(error);
    }
  }

  /**
   * CREATE MANY - Bulk insert
   * @param {Array} documents - Array of documents
   * @returns {Array} Inserted documents with _ids
   */
  async createMany(documents) {
    try {
      const collection = this.getCollection();
      
      const docsWithTimestamps = documents.map(doc => ({
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const result = await collection.insertMany(docsWithTimestamps);
      
      logger.debug(`Created ${result.insertedCount} documents in ${this.collectionName}`);
      
      return Object.values(result.insertedIds).map((id, index) => ({
        _id: id,
        ...docsWithTimestamps[index]
      }));
    } catch (error) {
      logger.error(`Error bulk creating in ${this.collectionName}:`, error);
      throw parseMongoError(error);
    }
  }

  /**
   * FIND BY ID
   * @param {string|ObjectId} id - Document ID
   * @param {Object} options - Query options (projection, etc.)
   * @returns {Object|null} Document or null
   */
  async findById(id, options = {}) {
    try {
      const collection = this.getCollection();
      const objectId = this.toObjectId(id);
      
      const document = await collection.findOne(
        { _id: objectId },
        options
      );
      
      return document;
    } catch (error) {
      logger.error(`Error finding document by ID in ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

  /**
   * FIND ONE - Find single document by filter
   * @param {Object} filter - Query filter
   * @param {Object} options - Query options
   * @returns {Object|null} Document or null
   */
  async findOne(filter = {}, options = {}) {
    try {
      const collection = this.getCollection();
      const document = await collection.findOne(filter, options);
      return document;
    } catch (error) {
      logger.error(`Error finding one in ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

  /**
   * FIND MANY - Find multiple documents
   * @param {Object} filter - Query filter
   * @param {Object} options - Query options (sort, limit, skip, projection)
   * @returns {Array} Array of documents
   */
  async findMany(filter = {}, options = {}) {
    try {
      const collection = this.getCollection();
      
      let query = collection.find(filter);
      
      // Apply options
      if (options.projection) {
        query = query.project(options.projection);
      }
      
      if (options.sort) {
        query = query.sort(options.sort);
      }
      
      if (options.skip) {
        query = query.skip(options.skip);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const documents = await query.toArray();
      return documents;
    } catch (error) {
      logger.error(`Error finding many in ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

  /**
   * COUNT - Count documents matching filter
   * @param {Object} filter - Query filter
   * @returns {number} Count
   */
  async count(filter = {}) {
    try {
      const collection = this.getCollection();
      const count = await collection.countDocuments(filter);
      return count;
    } catch (error) {
      logger.error(`Error counting in ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

  /**
   * UPDATE BY ID
   * @param {string|ObjectId} id - Document ID
   * @param {Object} update - Update operations
   * @returns {Object|null} Updated document
   */
  async updateById(id, update) {
    try {
      const collection = this.getCollection();
      const objectId = this.toObjectId(id);
      
      // Add updatedAt timestamp
      const updateDoc = {
        $set: {
          ...update,
          updatedAt: new Date()
        }
      };
      
      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        updateDoc,
        { returnDocument: 'after' }
      );
      
      if (!result.value) {
        return null;
      }
      
      logger.debug(`Updated document in ${this.collectionName}: ${id}`);
      return result.value;
    } catch (error) {
      logger.error(`Error updating by ID in ${this.collectionName}:`, error);
      throw parseMongoError(error);
    }
  }

  /**
   * UPDATE ONE - Update single document by filter
   * @param {Object} filter - Query filter
   * @param {Object} update - Update operations
   * @returns {Object} Update result
   */
  async updateOne(filter, update) {
    try {
      const collection = this.getCollection();
      
      const updateDoc = {
        $set: {
          ...update,
          updatedAt: new Date()
        }
      };
      
      const result = await collection.updateOne(filter, updateDoc);
      return result;
    } catch (error) {
      logger.error(`Error updating one in ${this.collectionName}:`, error);
      throw parseMongoError(error);
    }
  }

  /**
   * UPDATE MANY - Update multiple documents
   * @param {Object} filter - Query filter
   * @param {Object} update - Update operations
   * @returns {Object} Update result
   */
  async updateMany(filter, update) {
    try {
      const collection = this.getCollection();
      
      const updateDoc = {
        $set: {
          ...update,
          updatedAt: new Date()
        }
      };
      
      const result = await collection.updateMany(filter, updateDoc);
      
      logger.debug(`Updated ${result.modifiedCount} documents in ${this.collectionName}`);
      return result;
    } catch (error) {
      logger.error(`Error updating many in ${this.collectionName}:`, error);
      throw parseMongoError(error);
    }
  }

  /**
   * DELETE BY ID - Hard delete
   * @param {string|ObjectId} id - Document ID
   * @returns {boolean} Success status
   */
  async deleteById(id) {
    try {
      const collection = this.getCollection();
      const objectId = this.toObjectId(id);
      
      const result = await collection.deleteOne({ _id: objectId });
      
      if (result.deletedCount === 0) {
        return false;
      }
      
      logger.debug(`Deleted document from ${this.collectionName}: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting by ID in ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

  /**
   * SOFT DELETE - Set deletedAt timestamp
   * @param {string|ObjectId} id - Document ID
   * @returns {Object|null} Updated document
   */
  async softDelete(id) {
    try {
      return await this.updateById(id, { deletedAt: new Date() });
    } catch (error) {
      logger.error(`Error soft deleting in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * DELETE MANY
   * @param {Object} filter - Query filter
   * @returns {number} Number of deleted documents
   */
  async deleteMany(filter) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteMany(filter);
      
      logger.debug(`Deleted ${result.deletedCount} documents from ${this.collectionName}`);
      return result.deletedCount;
    } catch (error) {
      logger.error(`Error deleting many in ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

  /**
   * AGGREGATE - Run aggregation pipeline
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Array} Results
   */
  async aggregate(pipeline) {
    try {
      const collection = this.getCollection();
      const results = await collection.aggregate(pipeline).toArray();
      return results;
    } catch (error) {
      logger.error(`Error in aggregation for ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

  /**
   * EXISTS - Check if document exists
   * @param {Object} filter - Query filter
   * @returns {boolean} Exists
   */
  async exists(filter) {
    try {
      const collection = this.getCollection();
      const count = await collection.countDocuments(filter, { limit: 1 });
      return count > 0;
    } catch (error) {
      logger.error(`Error checking existence in ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }
}

module.exports = BaseRepository;