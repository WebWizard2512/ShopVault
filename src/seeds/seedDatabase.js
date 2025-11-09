require('dotenv').config();
const chalk = require('chalk');
const dbManager = require('../config/database');
const { COLLECTIONS, PRODUCT_STATUS, ORDER_STATUS, USER_ROLES } = require('../config/constants');
const logger = require('../utils/logger');
const { ObjectId } = require('mongodb');

class DatabaseSeeder {
  async seed() {
    try {
      console.clear();
      console.log(chalk.cyan('\n' + '═'.repeat(70)));
      console.log(chalk.cyan.bold('  DATABASE SEEDING - 1000 PRODUCTS'));
      console.log(chalk.cyan('═'.repeat(70) + '\n'));
      
      process.env.SKIP_BANNER = 'true';
      logger.info('Connecting to MongoDB...');
      await dbManager.connect();
      const db = dbManager.getDb();
      logger.success('Connected!\n');

      await this.cleanDatabase(db);
      
      const categoryIds = await this.seedCategories(db);
      await this.seedProducts(db, categoryIds);
      await this.seedUsers(db);
      await this.createIndexes(db);

      await this.showSummary(db);

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

  async cleanDatabase(db) {
    logger.info('Cleaning existing data...');
    
    try {
      await db.collection(COLLECTIONS.PRODUCTS).deleteMany({});
      await db.collection(COLLECTIONS.CATEGORIES).deleteMany({});
      await db.collection(COLLECTIONS.USERS).deleteMany({});
      await db.collection(COLLECTIONS.ORDERS).deleteMany({});
      await db.collection(COLLECTIONS.INVENTORY_TRANSACTIONS).deleteMany({});
      
      logger.success('Database cleaned\n');
    } catch (error) {
      logger.warn('Error cleaning database:', error.message);
    }
  }

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
    logger.success(`Seeded ${categories.length} categories\n`);

    // Return map of category slugs to IDs
    return categories.reduce((map, cat) => {
      map[cat.slug] = cat._id;
      return map;
    }, {});
  }

  async seedProducts(db, categoryIds) {
    logger.info('Seeding 1000 products...');

    // Product templates for different categories
    const productTemplates = {
      laptops: [
        { prefix: 'Dell XPS', brand: 'Dell', basePrice: 1299, priceVariance: 500, desc: 'Powerful laptop with Intel i7 processor' },
        { prefix: 'HP Pavilion', brand: 'HP', basePrice: 899, priceVariance: 300, desc: 'Reliable laptop for everyday computing' },
        { prefix: 'MacBook Pro', brand: 'Apple', basePrice: 1999, priceVariance: 800, desc: 'Premium laptop with M2 chip' },
        { prefix: 'Lenovo ThinkPad', brand: 'Lenovo', basePrice: 1099, priceVariance: 400, desc: 'Business-class laptop with excellent keyboard' },
        { prefix: 'ASUS ROG', brand: 'ASUS', basePrice: 1499, priceVariance: 600, desc: 'Gaming laptop with powerful graphics' }
      ],
      smartphones: [
        { prefix: 'iPhone', brand: 'Apple', basePrice: 999, priceVariance: 400, desc: 'Latest iPhone with advanced camera system' },
        { prefix: 'Samsung Galaxy', brand: 'Samsung', basePrice: 849, priceVariance: 350, desc: 'Flagship Android phone with stunning display' },
        { prefix: 'Google Pixel', brand: 'Google', basePrice: 699, priceVariance: 200, desc: 'Pure Android experience with excellent camera' },
        { prefix: 'OnePlus', brand: 'OnePlus', basePrice: 599, priceVariance: 200, desc: 'Fast charging smartphone with clean Android' },
        { prefix: 'Xiaomi', brand: 'Xiaomi', basePrice: 449, priceVariance: 150, desc: 'Feature-rich smartphone at affordable price' }
      ],
      headphones: [
        { prefix: 'Sony WH-1000XM', brand: 'Sony', basePrice: 399, priceVariance: 100, desc: 'Premium noise-canceling wireless headphones' },
        { prefix: 'Bose QuietComfort', brand: 'Bose', basePrice: 349, priceVariance: 100, desc: 'Industry-leading noise cancellation' },
        { prefix: 'AirPods Pro', brand: 'Apple', basePrice: 249, priceVariance: 50, desc: 'Apple AirPods with active noise cancellation' },
        { prefix: 'Sennheiser HD', brand: 'Sennheiser', basePrice: 299, priceVariance: 150, desc: 'Audiophile-grade wired headphones' },
        { prefix: 'JBL', brand: 'JBL', basePrice: 149, priceVariance: 80, desc: 'Affordable wireless headphones with great sound' }
      ],
      'mens-clothing': [
        { prefix: 'Cotton T-Shirt', brand: 'BasicWear', basePrice: 19.99, priceVariance: 15, desc: 'Comfortable cotton t-shirt, available in multiple colors' },
        { prefix: 'Slim Fit Jeans', brand: 'DenimCo', basePrice: 49.99, priceVariance: 30, desc: 'Stylish slim fit denim jeans' },
        { prefix: 'Dress Shirt', brand: 'FormalWear', basePrice: 39.99, priceVariance: 30, desc: 'Professional dress shirt for office wear' },
        { prefix: 'Hoodie', brand: 'StreetStyle', basePrice: 54.99, priceVariance: 25, desc: 'Warm and comfortable pullover hoodie' },
        { prefix: 'Chino Pants', brand: 'CasualPro', basePrice: 44.99, priceVariance: 20, desc: 'Versatile chino pants for any occasion' }
      ],
      'womens-clothing': [
        { prefix: 'Summer Floral Dress', brand: 'FloralStyle', basePrice: 39.99, priceVariance: 25, desc: 'Light and breezy floral print dress' },
        { prefix: 'Leggings', brand: 'ActiveFit', basePrice: 29.99, priceVariance: 15, desc: 'Comfortable stretch leggings for all-day wear' },
        { prefix: 'Blazer', brand: 'PowerSuit', basePrice: 79.99, priceVariance: 40, desc: 'Professional blazer for the modern woman' },
        { prefix: 'Blouse', brand: 'ElegantWear', basePrice: 34.99, priceVariance: 20, desc: 'Elegant blouse perfect for any occasion' },
        { prefix: 'Maxi Skirt', brand: 'BohoChic', basePrice: 44.99, priceVariance: 25, desc: 'Flowing maxi skirt with vibrant patterns' }
      ],
      books: [
        { prefix: 'The Midnight Library', brand: 'Penguin Books', basePrice: 14.99, priceVariance: 5, desc: 'Bestselling fiction novel by Matt Haig' },
        { prefix: 'Atomic Habits', brand: 'Avery', basePrice: 16.99, priceVariance: 5, desc: 'Life-changing book about building good habits' },
        { prefix: 'Project Hail Mary', brand: 'Ballantine', basePrice: 15.99, priceVariance: 5, desc: 'Science fiction thriller by Andy Weir' },
        { prefix: 'Sapiens', brand: 'Harper', basePrice: 18.99, priceVariance: 5, desc: 'A brief history of humankind by Yuval Noah Harari' },
        { prefix: 'The Psychology of Money', brand: 'Harriman', basePrice: 14.99, priceVariance: 5, desc: 'Timeless lessons on wealth and happiness' }
      ],
      'home-kitchen': [
        { prefix: 'Stainless Steel Cookware Set', brand: 'KitchenPro', basePrice: 149.99, priceVariance: 80, desc: '10-piece professional cookware set' },
        { prefix: 'Coffee Maker', brand: 'BrewMaster', basePrice: 79.99, priceVariance: 50, desc: 'Programmable coffee maker with thermal carafe' },
        { prefix: 'Blender', brand: 'BlendTech', basePrice: 89.99, priceVariance: 60, desc: 'High-power blender for smoothies and more' },
        { prefix: 'Knife Set', brand: 'SharpEdge', basePrice: 129.99, priceVariance: 70, desc: 'Professional 15-piece knife set with block' },
        { prefix: 'Air Fryer', brand: 'HealthyFry', basePrice: 99.99, priceVariance: 50, desc: 'Digital air fryer with multiple cooking presets' }
      ],
      'sports-outdoors': [
        { prefix: 'Yoga Mat Premium', brand: 'FitLife', basePrice: 29.99, priceVariance: 20, desc: 'Extra thick non-slip yoga mat' },
        { prefix: 'Dumbbell Set', brand: 'IronGrip', basePrice: 149.99, priceVariance: 100, desc: 'Adjustable dumbbell set for home gym' },
        { prefix: 'Running Shoes', brand: 'SpeedRun', basePrice: 89.99, priceVariance: 60, desc: 'Lightweight running shoes with cushioning' },
        { prefix: 'Camping Tent', brand: 'OutdoorPro', basePrice: 199.99, priceVariance: 150, desc: 'Waterproof 4-person camping tent' },
        { prefix: 'Bicycle', brand: 'RidePro', basePrice: 499.99, priceVariance: 300, desc: 'Mountain bike with 21-speed gears' }
      ]
    };

    const products = [];
    let productCounter = 0;
    const batchSize = 100;

    // Helper to generate variations
    const variations = ['Standard', 'Plus', 'Pro', 'Max', 'Ultra', 'Deluxe', 'Premium', 'Elite', 'Advanced'];
    const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const colors = ['Black', 'White', 'Blue', 'Red', 'Gray', 'Navy', 'Green'];
    const models = ['2023', '2024', 'V2', 'V3', 'Gen 2', 'Gen 3'];

    for (const [categorySlug, templates] of Object.entries(productTemplates)) {
      const categoryId = categoryIds[categorySlug];
      if (!categoryId) continue;

      // Generate 100 products per category (total ~1000)
      for (let i = 0; i < 100; i++) {
        const template = templates[i % templates.length];
        const variation = variations[Math.floor(Math.random() * variations.length)];
        const model = models[Math.floor(Math.random() * models.length)];
        
        let suffix = '';
        if (categorySlug.includes('clothing')) {
          suffix = ` ${colors[Math.floor(Math.random() * colors.length)]} ${sizes[Math.floor(Math.random() * sizes.length)]}`;
        } else {
          suffix = ` ${variation} ${model}`;
        }

        const name = `${template.prefix} ${suffix}`;
        const priceOffset = (Math.random() - 0.5) * template.priceVariance;
        const price = parseFloat((template.basePrice + priceOffset).toFixed(2));
        const cost = parseFloat((price * 0.6).toFixed(2));
        
        const quantity = Math.floor(Math.random() * 200) + 20;
        const reserved = Math.floor(Math.random() * 10);
        const available = quantity - reserved;
        
        const totalSold = Math.floor(Math.random() * 500);
        const revenue = parseFloat((totalSold * price).toFixed(2));

        const skuNumber = String(productCounter + 1).padStart(4, '0');

        products.push({
          name,
          description: `${template.desc}. High quality and durable. Model: ${model}. ${suffix}`,
          sku: `${template.brand.toUpperCase().replace(/\s+/g, '-')}-${categorySlug.toUpperCase()}-${skuNumber}`,
          price,
          cost,
          compareAtPrice: Math.random() > 0.7 ? parseFloat((price * 1.2).toFixed(2)) : null,
          categoryId,
          brand: template.brand,
          tags: [categorySlug, template.brand.toLowerCase(), variation.toLowerCase()],
          inventory: {
            quantity,
            reserved,
            available,
            reorderPoint: 10,
            reorderQuantity: 50
          },
          status: available > 0 ? PRODUCT_STATUS.AVAILABLE : PRODUCT_STATUS.OUT_OF_STOCK,
          images: [{
            url: `https://example.com/products/${categorySlug}/${skuNumber}.jpg`,
            alt: name,
            isPrimary: true
          }],
          variants: [],
          specifications: {
            model: model,
            year: '2024',
            warranty: '1 year'
          },
          seo: {
            metaTitle: name,
            metaDescription: template.desc,
            slug: name.toLowerCase().replace(/\s+/g, '-')
          },
          ratings: {
            average: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
            count: Math.floor(Math.random() * 500)
          },
          salesStats: {
            totalSold,
            revenue,
            lastSoldAt: totalSold > 0 ? new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) : null
          },
          isFeatured: Math.random() > 0.95,
          isActive: true,
          createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          deletedAt: null
        });

        productCounter++;

        // Insert in batches
        if (products.length === batchSize) {
          await db.collection(COLLECTIONS.PRODUCTS).insertMany(products);
          process.stdout.write(`\r  ✓ Created ${productCounter}/1000 products`);
          products.length = 0;
        }
      }
    }

    // Insert remaining products
    if (products.length > 0) {
      await db.collection(COLLECTIONS.PRODUCTS).insertMany(products);
      process.stdout.write(`\r  ✓ Created ${productCounter}/1000 products`);
    }

    console.log(''); // New line after progress

    // Update category product counts
    for (const [slug, categoryId] of Object.entries(categoryIds)) {
      const count = await db.collection(COLLECTIONS.PRODUCTS).countDocuments({ categoryId });
      await db.collection(COLLECTIONS.CATEGORIES).updateOne(
        { _id: categoryId },
        { $set: { productCount: count } }
      );
    }

    logger.success('Seeded 1000 products\n');
  }

  async seedUsers(db) {
    logger.info('Seeding users...');

    const users = [
      {
        email: 'admin@shopvault.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        phone: '+1234567890',
        role: 'ADMIN',
        addresses: [{
          label: 'Home',
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          country: 'USA',
          isDefault: true
        }],
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
        addresses: [{
          label: 'Home',
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90001',
          country: 'USA',
          isDefault: true
        }],
        wishlist: [],
        orderStats: { totalOrders: 5, totalSpent: 2499.95, lastOrderDate: new Date() },
        preferences: { newsletter: true, notifications: { email: true, sms: true } },
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.collection(COLLECTIONS.USERS).insertMany(users);
    logger.success(`Seeded ${users.length} users\n`);
  }

  async createIndexes(db) {
    logger.info('Creating indexes...');

    try {
      await db.collection(COLLECTIONS.PRODUCTS).createIndex({ name: 'text', description: 'text', tags: 'text' });
      await db.collection(COLLECTIONS.PRODUCTS).createIndex({ sku: 1 }, { unique: true });
      await db.collection(COLLECTIONS.PRODUCTS).createIndex({ categoryId: 1, price: 1 });
      await db.collection(COLLECTIONS.PRODUCTS).createIndex({ status: 1, isActive: 1 });

      await db.collection(COLLECTIONS.CATEGORIES).createIndex({ slug: 1 }, { unique: true });
      await db.collection(COLLECTIONS.CATEGORIES).createIndex({ parentId: 1, order: 1 });

      await db.collection(COLLECTIONS.USERS).createIndex({ email: 1 }, { unique: true });

      logger.success('Indexes created\n');
    } catch (error) {
      logger.warn('Some indexes may already exist\n');
    }
  }

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

if (require.main === module) {
  const seeder = new DatabaseSeeder();
  seeder.seed();
}

module.exports = new DatabaseSeeder();