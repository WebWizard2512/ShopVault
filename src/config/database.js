/**
 * MongoDB Database Connection Manager
 * 
 * LEARNING NOTES:
 * - Singleton Pattern: We create only ONE connection pool for the entire app
 * - Connection Pooling: MongoDB driver reuses connections (configured via MONGODB_POOL_SIZE)
 * - Why pooling? Opening/closing connections is expensive. Pooling = Performance!
 * - Error Handling: Retry logic with exponential backoff for production resilience
 */

const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

class DatabaseManager {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB with retry logic
   * @param {number} retries - Number of retry attempts
   * @param {number} delay - Delay between retries in ms
   */
  async connect(retries = 3, delay = 2000) {
    // If already connected, return existing connection
    if (this.isConnected && this.db) {
      logger.info('Using existing database connection');
      return this.db;
    }

    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.DATABASE_NAME || 'shopvault';
    const poolSize = parseInt(process.env.MONGODB_POOL_SIZE) || 10;

    // MongoDB connection options - BEST PRACTICES
    const options = {
      maxPoolSize: poolSize,           // Max simultaneous connections
      minPoolSize: 2,                  // Keep 2 connections always ready
      maxIdleTimeMS: 30000,            // Close idle connections after 30s
      serverSelectionTimeoutMS: 5000,  // Fail fast if can't connect in 5s
      socketTimeoutMS: 45000,          // Socket timeout 45s
      retryWrites: true,               // Automatic retry for write operations
      retryReads: true,                // Automatic retry for read operations
      compressors: ['zlib'],           // Network compression for performance
    };

    let lastError;

    // Retry loop with exponential backoff
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.info(`Connecting to MongoDB... (Attempt ${attempt}/${retries})`);
        logger.info(`URI: ${uri.replace(/\/\/.*@/, '//<credentials>@')}`); // Hide credentials in logs
        
        this.client = new MongoClient(uri, options);
        await this.client.connect();

        // Verify connection with ping
        await this.client.db('admin').command({ ping: 1 });
        
        this.db = this.client.db(dbName);
        this.isConnected = true;

        logger.success(`✅ Connected to MongoDB database: ${dbName}`);
        logger.info(`Connection pool size: ${poolSize}`);
        
        // Set up connection monitoring
        this.setupConnectionMonitoring();
        
        return this.db;

      } catch (error) {
        lastError = error;
        logger.error(`Connection attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < retries) {
          const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
          logger.info(`Retrying in ${waitTime}ms...`);
          await this.sleep(waitTime);
        }
      }
    }

    // All retries failed
    logger.error('Failed to connect to MongoDB after all retries');
    throw new Error(`MongoDB connection failed: ${lastError.message}`);
  }

  /**
   * Monitor connection events for debugging and health checks
   */
  setupConnectionMonitoring() {
    if (!this.client) return;

    // Connection pool monitoring
    this.client.on('connectionPoolCreated', () => {
      logger.debug('Connection pool created');
    });

    this.client.on('connectionCreated', () => {
      logger.debug('New connection created in pool');
    });

    this.client.on('connectionClosed', () => {
      logger.debug('Connection closed from pool');
    });

    // Error events
    this.client.on('error', (error) => {
      logger.error(`MongoDB client error: ${error.message}`);
    });

    this.client.on('timeout', () => {
      logger.warn('MongoDB operation timeout');
    });
  }

  /**
   * Get database instance
   */
  getDb() {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Get collection with type safety
   */
  getCollection(collectionName) {
    return this.getDb().collection(collectionName);
  }

  /**
   * Health check - verify database is responding
   */
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

  /**
 * Close database connection gracefully
 */
async disconnect() {
  try {
    if (this.client && this.isConnected) {
      // CRITICAL FIX: Remove all event listeners before closing
      this.client.removeAllListeners('connectionPoolCreated');
      this.client.removeAllListeners('connectionCreated');
      this.client.removeAllListeners('connectionClosed');
      this.client.removeAllListeners('error');
      this.client.removeAllListeners('timeout');

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

  /**
   * Utility: Sleep function for retry logic
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    if (!this.isConnected) {
      return null;
    }

    return {
      connected: this.isConnected,
      database: this.db?.databaseName,
      // Additional stats can be added here
    };
  }
}

// Export singleton instance
// WHY SINGLETON? We want ONE connection pool shared across the entire application
const dbManager = new DatabaseManager();

module.exports = dbManager;