/**
 * Database Seeding Script
 * 
 * LEARNING NOTES - SEEDING STRATEGY:
 * 
 * Why seed data?
 * - Test your application with realistic data
 * - Demo the system to stakeholders
 * - Development and testing
 * 
 * Best practices:
 * - Idempotent: Can run multiple times safely
 * - Clean before seed: Remove existing test data
 * - Realistic data: Mimics production
 * - Referenced IDs: Maintain relationships
 */

require('dotenv').config();
const chalk = require('chalk');
const dbManager = require('../config/database');
const { COLLECTIONS, PRODUCT_STATUS } = require('../config/constants');
const logger = require('../utils/logger');
const { ObjectId } = require('mongodb');

class DatabaseSeeder {
  async seed() {
    try {
      // Clear and show clean header
      console.clear();
      console.log(chalk.cyan('\n' + '═'.repeat(70)));
      console.log(chalk.cyan.bold('  DATABASE SEEDING'));
      console.log(chalk.cyan('═'.repeat(70) + '\n'));
      
      // Connect without banner
      process.env.SKIP_BANNER = 'true';
      logger.info('Connecting to MongoDB...');
      await dbManager.connect();
      const db = dbManager.getDb();
      logger.success('Connected!\n');

      // Step 1: Clean existing data
      await this.cleanDatabase(db);

      // Step 2: Seed categories
      const categoryIds = await this.seedCategories(db);

      // Step 3: Seed products
      await this.seedProducts(db, categoryIds);

      // Step 4: Seed users
      await this.seedUsers(db);

      // Step 5: Create indexes
      await this.createIndexes(db);

      logger.header('DATABASE SEEDING COMPLETED');
      logger.success('✅ Database seeded successfully!');
      
      // Show summary
      await this.showSummary(db);

      // Disconnect and exit
      await dbManager.disconnect();
      
      console.log('');
      logger.info('Run "npm start" to launch ShopVault CLI');
      console.log('');
      
      process.exit(0);

    } catch (error) {
      logger.error('Seeding failed:', error);
      process.exit(1);
    }
  }

  /**
   * Clean existing data
   */
  async cleanDatabase(db) {
    logger.info('Cleaning existing data...');
    
    try {
      await db.collection(COLLECTIONS.PRODUCTS).deleteMany({});
      await db.collection(COLLECTIONS.CATEGORIES).deleteMany({});
      await db.collection(COLLECTIONS.USERS).deleteMany({});
      await db.collection(COLLECTIONS.INVENTORY_TRANSACTIONS).deleteMany({});
      
      logger.success('Database cleaned');
    } catch (error) {
      logger.warn('Error cleaning database:', error.message);
    }
  }

  /**
   * Seed categories with hierarchy
   */
  async seedCategories(db) {
    logger.info('Seeding categories...');
    
    const categories = [
      // Root categories
      {
        _id: new ObjectId(),
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and gadgets',
        parentId: null,
        path: 'Electronics',
        level: 0,
        order: 1,
        isActive: true,
        productCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: 'Clothing',
        slug: 'clothing',
        description: 'Fashion and apparel',
        parentId: null,
        path: 'Clothing',
        level: 0,
        order: 2,
        isActive: true,
        productCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: 'Books',
        slug: 'books',
        description: 'Books and literature',
        parentId: null,
        path: 'Books',
        level: 0,
        order: 3,
        isActive: true,
        productCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: 'Home & Kitchen',
        slug: 'home-kitchen',
        description: 'Home and kitchen essentials',
        parentId: null,
        path: 'Home & Kitchen',
        level: 0,
        order: 4,
        isActive: true,
        productCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: 'Sports & Outdoors',
        slug: 'sports-outdoors',
        description: 'Sports and outdoor equipment',
        parentId: null,
        path: 'Sports & Outdoors',
        level: 0,
        order: 5,
        isActive: true,
        productCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Electronics subcategories
    const electronicsId = categories[0]._id;
    categories.push(
      {
        _id: new ObjectId(),
        name: 'Laptops',
        slug: 'laptops',
        description: 'Laptop computers',
        parentId: electronicsId,
        path: 'Electronics > Laptops',
        level: 1,
        order: 1,
        isActive: true,
        productCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: 'Smartphones',
        slug: 'smartphones',
        description: 'Mobile phones',
        parentId: electronicsId,
        path: 'Electronics > Smartphones',
        level: 1,
        order: 2,
        isActive: true,
        productCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: 'Headphones',
        slug: 'headphones',
        description: 'Audio devices',
        parentId: electronicsId,
        path: 'Electronics > Headphones',
        level: 1,
        order: 3,
        isActive: true,
        productCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    );

    // Clothing subcategories
    const clothingId = categories[1]._id;
    categories.push(
      {
        _id: new ObjectId(),
        name: "Men's Clothing",
        slug: 'mens-clothing',
        description: 'Clothing for men',
        parentId: clothingId,
        path: "Clothing > Men's Clothing",
        level: 1,
        order: 1,
        isActive: true,
        productCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: "Women's Clothing",
        slug: 'womens-clothing',
        description: 'Clothing for women',
        parentId: clothingId,
        path: "Clothing > Women's Clothing",
        level: 1,
        order: 2,
        isActive: true,
        productCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    );

    await db.collection(COLLECTIONS.CATEGORIES).insertMany(categories);
    logger.success(`Seeded ${categories.length} categories`);

    // Return map of category slugs to IDs
    return categories.reduce((map, cat) => {
      map[cat.slug] = cat._id;
      return map;
    }, {});
  }

  /**
   * Seed products
   */
  async seedProducts(db, categoryIds) {
    logger.info('Seeding products...');

    const products = [
      // Laptops
      {
        name: 'Dell XPS 15',
        description: 'Powerful laptop with 15.6" display, Intel i7, 16GB RAM, 512GB SSD',
        sku: 'DELL-XPS15-001',
        price: 1299.99,
        cost: 900,
        categoryId: categoryIds['laptops'],
        brand: 'Dell',
        tags: ['laptop', 'windows', 'productivity'],
        inventory: { quantity: 25, reserved: 0, available: 25, reorderPoint: 10, reorderQuantity: 20 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/dell-xps15.jpg', alt: 'Dell XPS 15', isPrimary: true }],
        specifications: { processor: 'Intel i7-11800H', ram: '16GB', storage: '512GB SSD', display: '15.6" FHD' },
        isFeatured: true,
        isActive: true,
        salesStats: { totalSold: 45, revenue: 58499.55, lastSoldAt: new Date(Date.now() - 86400000 * 2) },
        ratings: { average: 4.5, count: 120 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'MacBook Pro 14"',
        description: 'Apple MacBook Pro with M2 chip, 16GB RAM, 512GB SSD',
        sku: 'APPLE-MBP14-001',
        price: 1999.99,
        cost: 1500,
        categoryId: categoryIds['laptops'],
        brand: 'Apple',
        tags: ['laptop', 'macbook', 'professional'],
        inventory: { quantity: 15, reserved: 2, available: 13, reorderPoint: 5, reorderQuantity: 10 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/mbp14.jpg', alt: 'MacBook Pro 14', isPrimary: true }],
        specifications: { processor: 'Apple M2', ram: '16GB', storage: '512GB SSD', display: '14" Retina' },
        isFeatured: true,
        isActive: true,
        salesStats: { totalSold: 67, revenue: 133999.33, lastSoldAt: new Date() },
        ratings: { average: 4.8, count: 89 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'HP Pavilion Gaming',
        description: 'Gaming laptop with RTX 3060, Intel i5, 16GB RAM',
        sku: 'HP-GAMING-001',
        price: 899.99,
        cost: 650,
        categoryId: categoryIds['laptops'],
        brand: 'HP',
        tags: ['laptop', 'gaming', 'graphics'],
        inventory: { quantity: 30, reserved: 0, available: 30, reorderPoint: 10, reorderQuantity: 25 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/hp-gaming.jpg', alt: 'HP Pavilion Gaming', isPrimary: true }],
        specifications: { processor: 'Intel i5-11400H', ram: '16GB', storage: '512GB SSD', gpu: 'RTX 3060' },
        isFeatured: false,
        isActive: true,
        salesStats: { totalSold: 32, revenue: 28799.68, lastSoldAt: new Date(Date.now() - 86400000 * 5) },
        ratings: { average: 4.3, count: 54 },
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Smartphones
      {
        name: 'iPhone 14 Pro',
        description: 'Latest iPhone with A16 Bionic, 128GB storage, Pro camera system',
        sku: 'APPLE-IP14P-128',
        price: 999.99,
        cost: 750,
        categoryId: categoryIds['smartphones'],
        brand: 'Apple',
        tags: ['smartphone', 'ios', '5g'],
        inventory: { quantity: 50, reserved: 5, available: 45, reorderPoint: 15, reorderQuantity: 40 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/iphone14pro.jpg', alt: 'iPhone 14 Pro', isPrimary: true }],
        specifications: { storage: '128GB', display: '6.1" Super Retina XDR', camera: '48MP main', chip: 'A16 Bionic' },
        isFeatured: true,
        isActive: true,
        salesStats: { totalSold: 156, revenue: 155998.44, lastSoldAt: new Date() },
        ratings: { average: 4.7, count: 234 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Samsung Galaxy S23',
        description: 'Flagship Android phone with Snapdragon 8 Gen 2, 256GB',
        sku: 'SAMSUNG-S23-256',
        price: 849.99,
        cost: 600,
        categoryId: categoryIds['smartphones'],
        brand: 'Samsung',
        tags: ['smartphone', 'android', '5g'],
        inventory: { quantity: 40, reserved: 3, available: 37, reorderPoint: 10, reorderQuantity: 30 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/s23.jpg', alt: 'Galaxy S23', isPrimary: true }],
        specifications: { storage: '256GB', display: '6.1" Dynamic AMOLED', camera: '50MP main', processor: 'Snapdragon 8 Gen 2' },
        isFeatured: true,
        isActive: true,
        salesStats: { totalSold: 89, revenue: 75649.11, lastSoldAt: new Date(Date.now() - 86400000 * 1) },
        ratings: { average: 4.6, count: 167 },
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Headphones
      {
        name: 'Sony WH-1000XM5',
        description: 'Premium noise-canceling wireless headphones',
        sku: 'SONY-WH1000XM5',
        price: 399.99,
        cost: 250,
        categoryId: categoryIds['headphones'],
        brand: 'Sony',
        tags: ['headphones', 'wireless', 'noise-canceling'],
        inventory: { quantity: 60, reserved: 0, available: 60, reorderPoint: 20, reorderQuantity: 50 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/sony-wh1000xm5.jpg', alt: 'Sony WH-1000XM5', isPrimary: true }],
        specifications: { type: 'Over-ear', connectivity: 'Bluetooth 5.2', battery: '30 hours', features: 'Active NC' },
        isFeatured: true,
        isActive: true,
        salesStats: { totalSold: 213, revenue: 85197.87, lastSoldAt: new Date() },
        ratings: { average: 4.9, count: 456 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'AirPods Pro 2',
        description: 'Apple AirPods Pro with active noise cancellation',
        sku: 'APPLE-APP2',
        price: 249.99,
        cost: 180,
        categoryId: categoryIds['headphones'],
        brand: 'Apple',
        tags: ['earbuds', 'wireless', 'noise-canceling'],
        inventory: { quantity: 80, reserved: 4, available: 76, reorderPoint: 25, reorderQuantity: 60 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/airpods-pro2.jpg', alt: 'AirPods Pro 2', isPrimary: true }],
        specifications: { type: 'In-ear', connectivity: 'Bluetooth', battery: '6 hours', features: 'Adaptive Audio' },
        isFeatured: true,
        isActive: true,
        salesStats: { totalSold: 342, revenue: 85496.58, lastSoldAt: new Date() },
        ratings: { average: 4.7, count: 678 },
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Men's Clothing
      {
        name: 'Classic Cotton T-Shirt',
        description: 'Comfortable cotton t-shirt, available in multiple colors',
        sku: 'TSHIRT-MEN-001',
        price: 19.99,
        cost: 8,
        categoryId: categoryIds['mens-clothing'],
        brand: 'BasicWear',
        tags: ['clothing', 'casual', 'cotton'],
        inventory: { quantity: 200, reserved: 10, available: 190, reorderPoint: 50, reorderQuantity: 150 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/tshirt.jpg', alt: 'Cotton T-Shirt', isPrimary: true }],
        specifications: { material: '100% Cotton', fit: 'Regular', sizes: 'S, M, L, XL, XXL' },
        isFeatured: false,
        isActive: true,
        salesStats: { totalSold: 567, revenue: 11334.33, lastSoldAt: new Date() },
        ratings: { average: 4.2, count: 234 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Slim Fit Jeans',
        description: 'Stylish slim fit denim jeans',
        sku: 'JEANS-MEN-001',
        price: 49.99,
        cost: 25,
        categoryId: categoryIds['mens-clothing'],
        brand: 'DenimCo',
        tags: ['clothing', 'denim', 'jeans'],
        inventory: { quantity: 120, reserved: 5, available: 115, reorderPoint: 30, reorderQuantity: 100 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/jeans.jpg', alt: 'Slim Fit Jeans', isPrimary: true }],
        specifications: { material: 'Denim', fit: 'Slim', sizes: '28-38' },
        isFeatured: false,
        isActive: true,
        salesStats: { totalSold: 198, revenue: 9898.02, lastSoldAt: new Date(Date.now() - 86400000 * 3) },
        ratings: { average: 4.4, count: 145 },
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Women's Clothing
      {
        name: 'Summer Floral Dress',
        description: 'Light and breezy floral print dress',
        sku: 'DRESS-WOM-001',
        price: 39.99,
        cost: 20,
        categoryId: categoryIds['womens-clothing'],
        brand: 'FloralStyle',
        tags: ['clothing', 'dress', 'summer'],
        inventory: { quantity: 150, reserved: 8, available: 142, reorderPoint: 40, reorderQuantity: 120 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/dress.jpg', alt: 'Floral Dress', isPrimary: true }],
        specifications: { material: 'Cotton blend', style: 'A-line', sizes: 'XS, S, M, L, XL' },
        isFeatured: true,
        isActive: true,
        salesStats: { totalSold: 276, revenue: 11037.24, lastSoldAt: new Date() },
        ratings: { average: 4.6, count: 189 },
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Books
      {
        name: 'The Midnight Library',
        description: 'Bestselling fiction novel by Matt Haig',
        sku: 'BOOK-FIC-001',
        price: 14.99,
        cost: 7,
        categoryId: categoryIds['books'],
        brand: 'Penguin Books',
        tags: ['book', 'fiction', 'bestseller'],
        inventory: { quantity: 100, reserved: 2, available: 98, reorderPoint: 20, reorderQuantity: 80 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/midnight-library.jpg', alt: 'The Midnight Library', isPrimary: true }],
        specifications: { format: 'Paperback', pages: '304', author: 'Matt Haig', isbn: '978-0525559474' },
        isFeatured: true,
        isActive: true,
        salesStats: { totalSold: 445, revenue: 6670.55, lastSoldAt: new Date() },
        ratings: { average: 4.8, count: 892 },
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Home & Kitchen
      {
        name: 'Stainless Steel Cookware Set',
        description: '10-piece professional cookware set',
        sku: 'COOK-SET-001',
        price: 149.99,
        cost: 80,
        categoryId: categoryIds['home-kitchen'],
        brand: 'KitchenPro',
        tags: ['cookware', 'stainless-steel', 'kitchen'],
        inventory: { quantity: 45, reserved: 3, available: 42, reorderPoint: 15, reorderQuantity: 35 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/cookware.jpg', alt: 'Cookware Set', isPrimary: true }],
        specifications: { pieces: '10', material: 'Stainless Steel', dishwasher: 'Yes', oven_safe: 'Yes' },
        isFeatured: false,
        isActive: true,
        salesStats: { totalSold: 89, revenue: 13349.11, lastSoldAt: new Date(Date.now() - 86400000 * 7) },
        ratings: { average: 4.5, count: 123 },
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Sports & Outdoors
      {
        name: 'Yoga Mat Premium',
        description: 'Extra thick non-slip yoga mat with carrying strap',
        sku: 'YOGA-MAT-001',
        price: 29.99,
        cost: 12,
        categoryId: categoryIds['sports-outdoors'],
        brand: 'FitLife',
        tags: ['yoga', 'fitness', 'exercise'],
        inventory: { quantity: 180, reserved: 5, available: 175, reorderPoint: 50, reorderQuantity: 150 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/yoga-mat.jpg', alt: 'Yoga Mat', isPrimary: true }],
        specifications: { thickness: '6mm', material: 'TPE', dimensions: '183x61cm', non_slip: 'Yes' },
        isFeatured: false,
        isActive: true,
        salesStats: { totalSold: 523, revenue: 15685.77, lastSoldAt: new Date() },
        ratings: { average: 4.7, count: 456 },
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Low stock product
      {
        name: 'Limited Edition Smartwatch',
        description: 'Premium smartwatch with health tracking',
        sku: 'WATCH-LTD-001',
        price: 299.99,
        cost: 180,
        categoryId: categoryIds['electronics'],
        brand: 'TechWear',
        tags: ['smartwatch', 'fitness', 'limited'],
        inventory: { quantity: 5, reserved: 0, available: 5, reorderPoint: 10, reorderQuantity: 20 },
        status: PRODUCT_STATUS.AVAILABLE,
        images: [{ url: 'https://example.com/smartwatch.jpg', alt: 'Smartwatch', isPrimary: true }],
        specifications: { display: '1.4" AMOLED', battery: '7 days', waterproof: 'IP68' },
        isFeatured: true,
        isActive: true,
        salesStats: { totalSold: 95, revenue: 28499.05, lastSoldAt: new Date() },
        ratings: { average: 4.6, count: 78 },
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Out of stock product
      {
        name: 'Wireless Gaming Mouse',
        description: 'High-performance wireless gaming mouse',
        sku: 'MOUSE-GAME-001',
        price: 79.99,
        cost: 45,
        categoryId: categoryIds['electronics'],
        brand: 'GamePro',
        tags: ['gaming', 'mouse', 'wireless'],
        inventory: { quantity: 0, reserved: 0, available: 0, reorderPoint: 15, reorderQuantity: 50 },
        status: PRODUCT_STATUS.OUT_OF_STOCK,
        images: [{ url: 'https://example.com/gaming-mouse.jpg', alt: 'Gaming Mouse', isPrimary: true }],
        specifications: { dpi: '16000', wireless: 'Yes', rgb: 'Yes', buttons: '8' },
        isFeatured: false,
        isActive: true,
        salesStats: { totalSold: 267, revenue: 21357.33, lastSoldAt: new Date(Date.now() - 86400000 * 2) },
        ratings: { average: 4.8, count: 345 },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.collection(COLLECTIONS.PRODUCTS).insertMany(products);
    logger.success(`Seeded ${products.length} products`);

    // Update category product counts
    for (const [slug, categoryId] of Object.entries(categoryIds)) {
      const count = products.filter(p => p.categoryId.equals(categoryId)).length;
      await db.collection(COLLECTIONS.CATEGORIES).updateOne(
        { _id: categoryId },
        { $set: { productCount: count } }
      );
    }
  }

  /**
   * Seed users
   */
  async seedUsers(db) {
    logger.info('Seeding users...');

    // Get some product IDs for wishlists
    const products = await db.collection(COLLECTIONS.PRODUCTS).find({}).limit(5).toArray();
    const productIds = products.map(p => p._id);

    const users = [
      {
        email: 'admin@shopvault.com',
        password: 'admin123', // In production: hash this!
        firstName: 'Admin',
        lastName: 'User',
        phone: '+1234567890',
        role: 'ADMIN',
        addresses: [
          {
            label: 'Home',
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94102',
            country: 'USA',
            isDefault: true
          }
        ],
        wishlist: [],
        orderStats: { totalOrders: 0, totalSpent: 0, lastOrderDate: null },
        preferences: { newsletter: true, notifications: { email: true, sms: false } },
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'customer@example.com',
        password: 'customer123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1987654321',
        role: 'CUSTOMER',
        addresses: [
          {
            label: 'Home',
            street: '456 Oak Ave',
            city: 'Los Angeles',
            state: 'CA',
            postalCode: '90001',
            country: 'USA',
            isDefault: true
          }
        ],
        wishlist: productIds.slice(0, 3).map(id => ({
          productId: id,
          addedAt: new Date(),
          notes: ''
        })),
        orderStats: { totalOrders: 5, totalSpent: 2499.95, lastOrderDate: new Date() },
        preferences: { newsletter: true, notifications: { email: true, sms: true } },
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.collection(COLLECTIONS.USERS).insertMany(users);
    logger.success(`Seeded ${users.length} users`);
  }

  /**
   * Create indexes
   */
  async createIndexes(db) {
    logger.info('Creating indexes...');

    try {
      // Product indexes
      await db.collection(COLLECTIONS.PRODUCTS).createIndex({ name: 'text', description: 'text', tags: 'text' });
      await db.collection(COLLECTIONS.PRODUCTS).createIndex({ sku: 1 }, { unique: true });
      await db.collection(COLLECTIONS.PRODUCTS).createIndex({ categoryId: 1, price: 1 });
      await db.collection(COLLECTIONS.PRODUCTS).createIndex({ status: 1, isActive: 1 });

      // Category indexes
      await db.collection(COLLECTIONS.CATEGORIES).createIndex({ slug: 1 }, { unique: true });
      await db.collection(COLLECTIONS.CATEGORIES).createIndex({ parentId: 1, order: 1 });

      // User indexes
      await db.collection(COLLECTIONS.USERS).createIndex({ email: 1 }, { unique: true });

      logger.success('Indexes created');
    } catch (error) {
      logger.warn('Some indexes may already exist:', error.message);
    }
  }

  /**
   * Show summary
   */
  async showSummary(db) {
    logger.separator();
    logger.header('SEEDING SUMMARY');

    const productCount = await db.collection(COLLECTIONS.PRODUCTS).countDocuments({});
    const categoryCount = await db.collection(COLLECTIONS.CATEGORIES).countDocuments({});
    const userCount = await db.collection(COLLECTIONS.USERS).countDocuments({});

    console.log('');
    logger.info(`📦 Products: ${productCount}`);
    logger.info(`📁 Categories: ${categoryCount}`);
    logger.info(`👥 Users: ${userCount}`);
    console.log('');
    logger.info('Sample credentials:');
    logger.info('  Admin: admin@shopvault.com / admin123');
    logger.info('  Customer: customer@example.com / customer123');
    console.log('');
    logger.separator();
  }
}

// Run seeder if executed directly
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  seeder.seed();
}

module.exports = new DatabaseSeeder();