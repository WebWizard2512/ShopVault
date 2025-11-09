/**
 * Base Repository Pattern
 */

const { ObjectId } = require('mongodb');
const dbManager = require('../config/database');
const logger = require('../utils/logger');
const { DatabaseError, parseMongoError } = require('../utils/errorHandler');

class BaseRepository {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  getCollection() {
    return dbManager.getCollection(this.collectionName);
  }

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

  async create(data) {
    try {
      const collection = this.getCollection();
      
      const document = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await collection.insertOne(document);
      
      return {
        _id: result.insertedId,
        ...document
      };
    } catch (error) {
      logger.error(`Error creating document in ${this.collectionName}:`, error);
      throw parseMongoError(error);
    }
  }

  async createMany(documents) {
    try {
      const collection = this.getCollection();
      
      const docsWithTimestamps = documents.map(doc => ({
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const result = await collection.insertMany(docsWithTimestamps);
      
      return Object.values(result.insertedIds).map((id, index) => ({
        _id: id,
        ...docsWithTimestamps[index]
      }));
    } catch (error) {
      logger.error(`Error bulk creating in ${this.collectionName}:`, error);
      throw parseMongoError(error);
    }
  }

  async findById(id, options = {}) {
    try {
      const collection = this.getCollection();
      const objectId = this.toObjectId(id);
      
      return await collection.findOne({ _id: objectId }, options);
    } catch (error) {
      logger.error(`Error finding document by ID in ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

  async findOne(filter = {}, options = {}) {
    try {
      const collection = this.getCollection();
      return await collection.findOne(filter, options);
    } catch (error) {
      logger.error(`Error finding one in ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

  async findMany(filter = {}, options = {}) {
    try {
      const collection = this.getCollection();
      
      let query = collection.find(filter);
      
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
      
      return await query.toArray();
    } catch (error) {
      logger.error(`Error finding many in ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

  async count(filter = {}) {
    try {
      const collection = this.getCollection();
      return await collection.countDocuments(filter);
    } catch (error) {
      logger.error(`Error counting in ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

  async updateById(id, update) {
    try {
      const collection = this.getCollection();
      const objectId = this.toObjectId(id);
      
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
      
      return result || null;
    } catch (error) {
      logger.error(`Error updating by ID in ${this.collectionName}:`, error);
      throw parseMongoError(error);
    }
  }

  async updateOne(filter, update) {
    try {
      const collection = this.getCollection();
      
      const updateDoc = {
        $set: {
          ...update,
          updatedAt: new Date()
        }
      };
      
      return await collection.updateOne(filter, updateDoc);
    } catch (error) {
      logger.error(`Error updating one in ${this.collectionName}:`, error);
      throw parseMongoError(error);
    }
  }

  async updateMany(filter, update) {
    try {
      const collection = this.getCollection();
      
      const updateDoc = {
        $set: {
          ...update,
          updatedAt: new Date()
        }
      };
      
      return await collection.updateMany(filter, updateDoc);
    } catch (error) {
      logger.error(`Error updating many in ${this.collectionName}:`, error);
      throw parseMongoError(error);
    }
  }

  async deleteById(id) {
    try {
      const collection = this.getCollection();
      const objectId = this.toObjectId(id);
      
      const result = await collection.deleteOne({ _id: objectId });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error(`Error deleting by ID in ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

  async softDelete(id) {
    try {
      return await this.updateById(id, { deletedAt: new Date() });
    } catch (error) {
      logger.error(`Error soft deleting in ${this.collectionName}:`, error);
      throw error;
    }
  }

  async deleteMany(filter) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteMany(filter);
      return result.deletedCount;
    } catch (error) {
      logger.error(`Error deleting many in ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

  async aggregate(pipeline) {
    try {
      const collection = this.getCollection();
      return await collection.aggregate(pipeline).toArray();
    } catch (error) {
      logger.error(`Error in aggregation for ${this.collectionName}:`, error);
      throw new DatabaseError(error.message, error);
    }
  }

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