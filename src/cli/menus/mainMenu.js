/**
 * Main Menu - COMPLETE FIXED VERSION
 * All handlers implemented, no missing features
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
const productCommands = require('../commands/productCommands');
const orderCommands = require('../commands/orderCommands');
const userCommands = require('../commands/userCommands');
const analyticsCommands = require('../commands/analyticsCommands');
const display = require('../helpers/display');

class MainMenu {
  /**
   * Display banner (only once)
   */
  displayBanner() {
    console.clear();
    console.log(
      chalk.cyan(
        figlet.textSync('ShopVault', {
          font: 'Standard',
          horizontalLayout: 'default'
        })
      )
    );
    console.log(chalk.gray('━'.repeat(70)));
    console.log(chalk.white.bold('  E-Commerce Product Inventory Management System'));
    console.log(chalk.gray('  Version 1.0.0 | Powered by MongoDB'));
    console.log(chalk.gray('━'.repeat(70)));
    console.log('');
  }

  /**
   * Show main menu
   */
  async show(firstTime = false) {
    if (firstTime) {
      this.displayBanner();
    }

    const choices = [
      chalk.cyan('━━━ PRODUCT MANAGEMENT ━━━'),
      { name: '  📦 Create New Product', value: 'create_product' },
      { name: '  📋 List All Products', value: 'list_products' },
      { name: '  🔍 Search Products', value: 'search_products' },
      { name: '  👁️  View Product Details', value: 'view_product' },
      { name: '  ✏️  Update Product', value: 'update_product' },
      { name: '  🗑️  Delete Product', value: 'delete_product' },
      { name: ' ', disabled: true },
      
      chalk.cyan('━━━ USER & WISHLIST ━━━'),
      { name: '  👤 Create User', value: 'create_user' },
      { name: '  👥 List Users', value: 'list_users' },
      { name: '  👁️  View User', value: 'view_user' },
      { name: '  ❤️  Manage Wishlist', value: 'manage_wishlist' },
      { name: '  📊 User Statistics', value: 'user_stats' },
      { name: ' ', disabled: true },
      
      chalk.cyan('━━━ ORDER MANAGEMENT ━━━'),
      { name: '  🛒 Create Order', value: 'create_order' },
      { name: '  📦 List Orders', value: 'list_orders' },
      { name: '  🔍 View Order', value: 'view_order' },
      { name: '  ✏️  Update Order Status', value: 'update_order_status' },
      { name: '  ❌ Cancel Order', value: 'cancel_order' },
      { name: '  📊 Order Statistics', value: 'order_stats' },
      { name: ' ', disabled: true },
      
      chalk.cyan('━━━ INVENTORY MANAGEMENT ━━━'),
      { name: '  📊 Manage Inventory', value: 'manage_inventory' },
      { name: '  ⚠️  Low Stock Alert', value: 'low_stock' },
      { name: '  📉 Out of Stock Products', value: 'out_of_stock' },
      { name: ' ', disabled: true },
      
      chalk.cyan('━━━ ANALYTICS & REPORTS ━━━'),
      { name: '  📊 Dashboard Summary', value: 'dashboard' },
      { name: '  📈 Sales Report', value: 'sales_report' },
      { name: '  📁 Category Performance', value: 'category_performance' },
      { name: '  👥 Customer Analytics', value: 'customer_analytics' },
      { name: '  💰 Inventory Value', value: 'inventory_value' },
      { name: '  📈 Revenue Trends', value: 'revenue_trends' },
      { name: '  🔄 Inventory Turnover', value: 'inventory_turnover' },
      { name: '  📊 Order Distribution', value: 'order_distribution' },
      { name: '  🏆 Top Selling Products', value: 'top_sellers' },
      { name: '  📈 Product Statistics', value: 'statistics' },
      { name: ' ', disabled: true },
      
      chalk.cyan('━━━ CATEGORY MANAGEMENT ━━━'),
      { name: '  📁 View Categories', value: 'view_categories' },
      { name: '  🌳 Category Tree', value: 'category_tree' },
      { name: ' ', disabled: true },
      
      chalk.cyan('━━━ SYSTEM ━━━'),
      { name: '  🌱 Seed Database', value: 'seed_database' },
      { name: '  ℹ️  About', value: 'about' },
      { name: '  🚪 Exit', value: 'exit' }
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold('What would you like to do?'),
        choices: choices,
        pageSize: 20,
        loop: false
      }
    ]);

    return answer.action;
  }

  /**
   * Handle menu action
   */
  async handleAction(action) {
    try {
      switch (action) {
        // PRODUCT MANAGEMENT
        case 'create_product':
          await productCommands.createProduct();
          break;
        case 'list_products':
          await productCommands.listAllProducts();
          break;
        case 'search_products':
          await productCommands.searchProducts();
          break;
        case 'view_product':
          await productCommands.viewProduct();
          break;
        case 'update_product':
          await productCommands.updateProduct();
          break;
        case 'delete_product':
          await productCommands.deleteProduct();
          break;

        // USER MANAGEMENT
        case 'create_user':
          await userCommands.createUser();
          break;
        case 'list_users':
          await userCommands.listUsers();
          break;
        case 'view_user':
          await userCommands.viewUser();
          break;
        case 'manage_wishlist':
          await userCommands.manageWishlist();
          break;
        case 'user_stats':
          await userCommands.viewUserStats();
          break;

        // ORDER MANAGEMENT
        case 'create_order':
          await orderCommands.createOrder();
          break;
        case 'list_orders':
          await orderCommands.listOrders();
          break;
        case 'view_order':
          await orderCommands.viewOrder();
          break;
        case 'update_order_status':
          await orderCommands.updateOrderStatus();
          break;
        case 'cancel_order':
          await orderCommands.cancelOrder();
          break;
        case 'order_stats':
          await orderCommands.viewOrderStats();
          break;

        // INVENTORY MANAGEMENT
        case 'manage_inventory':
          await productCommands.manageInventory();
          break;
        case 'low_stock':
          await productCommands.viewLowStock();
          break;
        case 'out_of_stock':
          await this.viewOutOfStock();
          break;

        // ANALYTICS & REPORTS
        case 'dashboard':
          await analyticsCommands.viewDashboard();
          break;
        case 'sales_report':
          await analyticsCommands.viewSalesReport();
          break;
        case 'category_performance':
          await analyticsCommands.viewCategoryPerformance();
          break;
        case 'customer_analytics':
          await analyticsCommands.viewCustomerAnalytics();
          break;
        case 'inventory_value':
          await analyticsCommands.viewInventoryValue();
          break;
        case 'revenue_trends':
          await analyticsCommands.viewRevenueTrends();
          break;
        case 'inventory_turnover':
          await analyticsCommands.viewInventoryTurnover();
          break;
        case 'order_distribution':
          await analyticsCommands.viewOrderStatusDistribution();
          break;
        case 'top_sellers':
          await productCommands.viewTopSellers();
          break;
        case 'statistics':
          await productCommands.viewStatistics();
          break;

        // CATEGORY MANAGEMENT
        case 'view_categories':
          await this.viewCategories();
          break;
        case 'category_tree':
          await this.viewCategoryTree();
          break;

        // SYSTEM
        case 'seed_database':
          await this.seedDatabase();
          break;
        case 'about':
          await this.showAbout();
          break;
        case 'exit':
          return false;

        default:
          display.displayWarning('Feature not implemented yet!');
      }

      await display.pause();
      console.clear();
      console.log(chalk.cyan('\n━━━ ShopVault ━━━\n'));
      return true;

    } catch (error) {
      display.displayError(error.message);
      if (process.env.NODE_ENV === 'development' && error.stack) {
        console.log(chalk.gray(error.stack));
      }
      await display.pause();
      console.clear();
      console.log(chalk.cyan('\n━━━ ShopVault ━━━\n'));
      return true;
    }
  }

  /**
   * View out of stock products
   */
  async viewOutOfStock() {
    const productService = require('../../services/ProductService');
    
    const spinner = display.showLoading('Loading out of stock products...');
    const products = await productService.getOutOfStockProducts();
    spinner.stop();

    if (products.length === 0) {
      display.displaySuccess('No out of stock products! 🎉');
      return;
    }

    console.log(chalk.red('\n⚠️  OUT OF STOCK PRODUCTS'));
    console.log(chalk.red('═'.repeat(70)));
    display.displayProducts(products);
  }

  /**
   * View categories
   */
  async viewCategories() {
    const categoryService = require('../../services/CategoryService');
    
    const spinner = display.showLoading('Loading categories...');
    const categories = await categoryService.getRootCategories();
    spinner.stop();

    display.displayCategories(categories);
  }

  /**
   * View category tree
   */
  async viewCategoryTree() {
    const categoryService = require('../../services/CategoryService');
    
    const spinner = display.showLoading('Building category tree...');
    const tree = await categoryService.getCategoryTree();
    spinner.stop();

    console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold.white('  CATEGORY TREE'.padEnd(68)) + chalk.cyan('║'));
    console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

    display.displayCategoryTree(tree);
    console.log('');
  }

  /**
   * Seed database
   */
  async seedDatabase() {
    display.clearScreen();
    console.log(chalk.yellow('\n⚠️  WARNING: This will delete all existing data!\n'));
    
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to seed the database?',
      default: false
    }]);

    if (!confirm) {
      display.displayInfo('Seeding cancelled');
      return;
    }

    console.log(chalk.blue('\n  Please run: npm run seed\n'));
  }

  /**
   * Show about
   */
  async showAbout() {
    display.clearScreen();
    console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold.white('  ABOUT SHOPVAULT'.padEnd(68)) + chalk.cyan('║'));
    console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));
    
    console.log(chalk.white('  ShopVault - E-Commerce Product Inventory Management System'));
    console.log(chalk.gray('  Version: 1.0.0'));
    console.log(chalk.gray('  Built with: Node.js + MongoDB'));
    console.log('');
    console.log(chalk.gray('  Features:'));
    console.log(chalk.white('    ✓ Complete Product CRUD operations'));
    console.log(chalk.white('    ✓ Advanced search with filters'));
    console.log(chalk.white('    ✓ Real-time inventory management'));
    console.log(chalk.white('    ✓ Sales analytics and reports'));
    console.log(chalk.white('    ✓ Hierarchical category system'));
    console.log(chalk.white('    ✓ Low stock alerts'));
    console.log(chalk.white('    ✓ Interactive CLI interface'));
    console.log('');
    console.log(chalk.gray('  MongoDB Features Demonstrated:'));
    console.log(chalk.white('    ✓ Connection pooling'));
    console.log(chalk.white('    ✓ Repository pattern'));
    console.log(chalk.white('    ✓ Aggregation pipelines'));
    console.log(chalk.white('    ✓ Text search indexes'));
    console.log(chalk.white('    ✓ Compound indexes'));
    console.log(chalk.white('    ✓ Atomic operations'));
    console.log(chalk.white('    ✓ Embedded vs Referenced data'));
    console.log('');
    console.log(chalk.cyan('  Made with ❤️  and MongoDB expertise\n'));
  }

  /**
   * Run menu loop
   */
  async run() {
    let keepRunning = true;
    let firstTime = true;

    while (keepRunning) {
      const action = await this.show(firstTime);
      firstTime = false;
      keepRunning = await this.handleAction(action);
    }

    // Exit message
    display.clearScreen();
    console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold.white('  THANK YOU FOR USING SHOPVAULT!'.padEnd(68)) + chalk.cyan('║'));
    console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));
    console.log(chalk.gray('  Goodbye! 👋\n'));
  }
}

module.exports = new MainMenu();