/**
 * MongoDB Database Connection Manager
 */

const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

class DatabaseManager {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect(retries = 3, delay = 2000) {
    if (this.isConnected && this.db) {
      return this.db;
    }

    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.DATABASE_NAME || 'shopvault';
    const poolSize = parseInt(process.env.MONGODB_POOL_SIZE) || 10;

    const options = {
      maxPoolSize: poolSize,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true,
      compressors: ['zlib']
    };

    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.info(`Connecting to MongoDB (Attempt ${attempt}/${retries})...`);
        
        this.client = new MongoClient(uri, options);
        await this.client.connect();
        await this.client.db('admin').command({ ping: 1 });
        
        this.db = this.client.db(dbName);
        this.isConnected = true;

        logger.success(`Connected to MongoDB: ${dbName}`);
        logger.info(`Connection pool size: ${poolSize}`);
        
        return this.db;

      } catch (error) {
        lastError = error;
        logger.error(`Connection attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < retries) {
          const waitTime = delay * Math.pow(2, attempt - 1);
          logger.info(`Retrying in ${waitTime}ms...`);
          await this.sleep(waitTime);
        }
      }
    }

    throw new Error(`MongoDB connection failed: ${lastError.message}`);
  }

  getDb() {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  getCollection(collectionName) {
    return this.getDb().collection(collectionName);
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { healthy: false, message: 'Not connected' };
      }

      await this.client.db('admin').command({ ping: 1 });
      
      return {
        healthy: true,
        message: 'Database is responsive',
        database: this.db.databaseName
      };
    } catch (error) {
      return {
        healthy: false,
        message: error.message
      };
    }
  }

  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.close();
        this.isConnected = false;
        this.db = null;
        this.client = null;
        logger.info('Disconnected from MongoDB');
      }
    } catch (error) {
      logger.error(`Error disconnecting: ${error.message}`);
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getConnectionStats() {
    if (!this.isConnected) {
      return null;
    }

    return {
      connected: this.isConnected,
      database: this.db?.databaseName
    };
  }
}

module.exports = new DatabaseManager();