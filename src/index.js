require('dotenv').config();
const figlet = require('figlet');
const chalk = require('chalk');
const dbManager = require('./config/database');
const logger = require('./utils/logger');

function displayBanner() {
  if (process.env.SKIP_BANNER) return;
  
  console.clear();
  console.log(
    chalk.cyan(
      figlet.textSync('ShopVault', {
        font: 'Standard',
        horizontalLayout: 'default'
      })
    )
  );
  console.log(chalk.gray('━'.repeat(60)));
  console.log(chalk.white.bold('  E-Commerce Product Inventory Management System'));
  console.log(chalk.gray('  Powered by MongoDB | Built with Node.js'));
  console.log(chalk.gray('━'.repeat(60)));
  console.log('');
}

async function initializeApp() {
  try {
    displayBanner();
    
    logger.info('Starting ShopVault...');
    logger.info('Environment: ' + (process.env.NODE_ENV || 'development'));
    
    await dbManager.connect();
    
    const health = await dbManager.healthCheck();
    if (health.healthy) {
      logger.success(`Connected to database: ${health.database}`);
    } else {
      throw new Error('Database health check failed');
    }
    
    logger.success('ShopVault initialized successfully!');
    console.log('');
    
    const mainMenu = require('./cli/menus/mainMenu');
    await mainMenu.run();
    
    await dbManager.disconnect();
    
  } catch (error) {
    logger.error('Failed to initialize ShopVault:', error);
    await dbManager.disconnect();
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('\nShutting down gracefully...');
  
  try {
    await dbManager.disconnect();
    logger.success('Disconnected from database');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown();
});

initializeApp();