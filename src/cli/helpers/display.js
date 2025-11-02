/**
 * Display Helper Utilities
 * 
 * LEARNING NOTES - CLI UX:
 * Beautiful terminal output matters!
 * - Tables for structured data
 * - Colors for visual hierarchy
 * - Clear formatting for readability
 */

const Table = require('cli-table3');
const chalk = require('chalk');

class DisplayHelper {
  /**
   * Display products in a table
   */
  displayProducts(products) {
    if (!products || products.length === 0) {
      console.log(chalk.yellow('\n⚠️  No products found\n'));
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('SKU'),
        chalk.cyan('Name'),
        chalk.cyan('Price'),
        chalk.cyan('Stock'),
        chalk.cyan('Status')
      ],
      colWidths: [26, 18, 35, 12, 10, 15],
      wordWrap: true
    });

    products.forEach(product => {
      const stockColor = product.inventory.available === 0 ? chalk.red :
                        product.inventory.available < 10 ? chalk.yellow :
                        chalk.green;

      const statusColor = product.status === 'AVAILABLE' ? chalk.green :
                         product.status === 'OUT_OF_STOCK' ? chalk.red :
                         chalk.yellow;

      table.push([
        chalk.gray(product._id.toString().slice(-8)),
        chalk.white(product.sku),
        chalk.white(product.name.substring(0, 32)),
        chalk.green(`$${product.price.toFixed(2)}`),
        stockColor(product.inventory.available.toString()),
        statusColor(product.status)
      ]);
    });

    console.log('\n' + table.toString() + '\n');
  }

  /**
   * Display single product details
   */
  displayProductDetails(product) {
    console.log('\n' + chalk.cyan('═'.repeat(70)));
    console.log(chalk.bold.white(`  ${product.name}`));
    console.log(chalk.cyan('═'.repeat(70)));
    
    console.log(chalk.gray('  ID:          ') + chalk.white(product._id));
    console.log(chalk.gray('  SKU:         ') + chalk.white(product.sku));
    console.log(chalk.gray('  Price:       ') + chalk.green(`$${product.price.toFixed(2)}`));
    
    if (product.compareAtPrice) {
      console.log(chalk.gray('  Compare At:  ') + chalk.strikethrough(`$${product.compareAtPrice.toFixed(2)}`));
    }
    
    console.log(chalk.gray('  Brand:       ') + chalk.white(product.brand || 'N/A'));
    console.log(chalk.gray('  Status:      ') + this.getStatusBadge(product.status));
    
    console.log(chalk.gray('\n  Inventory:'));
    console.log(chalk.gray('    Total:     ') + chalk.white(product.inventory.quantity));
    console.log(chalk.gray('    Available: ') + this.getStockColor(product.inventory.available));
    console.log(chalk.gray('    Reserved:  ') + chalk.yellow(product.inventory.reserved));
    
    if (product.salesStats && product.salesStats.totalSold > 0) {
      console.log(chalk.gray('\n  Sales Stats:'));
      console.log(chalk.gray('    Total Sold:') + chalk.white(` ${product.salesStats.totalSold} units`));
      console.log(chalk.gray('    Revenue:   ') + chalk.green(`$${product.salesStats.revenue.toFixed(2)}`));
    }
    
    if (product.ratings && product.ratings.count > 0) {
      console.log(chalk.gray('\n  Ratings:'));
      console.log(chalk.gray('    Average:   ') + this.getStarRating(product.ratings.average));
      console.log(chalk.gray('    Reviews:   ') + chalk.white(product.ratings.count));
    }
    
    console.log(chalk.gray('\n  Description:'));
    console.log(chalk.white(`    ${product.description}`));
    
    if (product.tags && product.tags.length > 0) {
      console.log(chalk.gray('\n  Tags:        ') + product.tags.map(t => chalk.blue(`#${t}`)).join(' '));
    }
    
    console.log(chalk.cyan('═'.repeat(70)) + '\n');
  }

  /**
   * Display categories in a table
   */
  displayCategories(categories) {
    if (!categories || categories.length === 0) {
      console.log(chalk.yellow('\n⚠️  No categories found\n'));
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('Name'),
        chalk.cyan('Slug'),
        chalk.cyan('Level'),
        chalk.cyan('Products'),
        chalk.cyan('Status')
      ],
      colWidths: [26, 30, 25, 8, 10, 10]
    });

    categories.forEach(category => {
      const indent = '  '.repeat(category.level);
      
      table.push([
        chalk.gray(category._id.toString().slice(-8)),
        chalk.white(indent + category.name),
        chalk.gray(category.slug),
        chalk.yellow(category.level),
        chalk.green(category.productCount || 0),
        category.isActive ? chalk.green('✓') : chalk.red('✗')
      ]);
    });

    console.log('\n' + table.toString() + '\n');
  }

  /**
   * Display category tree
   */
  displayCategoryTree(categories, level = 0) {
    categories.forEach(category => {
      const indent = '  '.repeat(level);
      const icon = category.children && category.children.length > 0 ? '📁' : '📄';
      
      console.log(
        indent + icon + ' ' +
        chalk.white(category.name) +
        chalk.gray(` (${category.productCount || 0} products)`)
      );

      if (category.children && category.children.length > 0) {
        this.displayCategoryTree(category.children, level + 1);
      }
    });
  }

  /**
   * Display search results with pagination
   */
  displaySearchResults(result) {
    if (result.total === 0) {
      console.log(chalk.yellow('\n⚠️  No products match your search\n'));
      return;
    }

    console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold.white('  SEARCH RESULTS'.padEnd(68)) + chalk.cyan('║'));
    console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝'));

    this.displayProducts(result.products);

    // Pagination info
    const { page, limit, total, pages } = result.pagination;
    console.log(chalk.gray(`  Page ${page} of ${pages} | Total: ${total} products\n`));
  }

  /**
   * Display statistics
   */
  displayStats(stats) {
    console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold.white('  PRODUCT STATISTICS'.padEnd(68)) + chalk.cyan('║'));
    console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

    const table = new Table({
      head: [],
      colWidths: [35, 35]
    });

    table.push(
      [chalk.gray('Total Products:'), chalk.white(stats.totalProducts || 0)],
      [chalk.gray('Total Inventory Value:'), chalk.green(`$${(stats.totalValue || 0).toFixed(2)}`)],
      [chalk.gray('Average Price:'), chalk.green(`$${(stats.averagePrice || 0).toFixed(2)}`)],
      [chalk.gray('Total Items in Stock:'), chalk.white(stats.totalInventory || 0)],
      [chalk.gray('Total Units Sold:'), chalk.yellow(stats.totalSold || 0)],
      [chalk.gray('Total Revenue:'), chalk.green.bold(`$${(stats.totalRevenue || 0).toFixed(2)}`)]
    );

    console.log(table.toString() + '\n');
  }

  /**
   * Display top sellers
   */
  displayTopSellers(products) {
    if (!products || products.length === 0) {
      console.log(chalk.yellow('\n⚠️  No sales data available\n'));
      return;
    }

    console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold.white('  TOP SELLING PRODUCTS'.padEnd(68)) + chalk.cyan('║'));
    console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

    const table = new Table({
      head: [
        chalk.cyan('Rank'),
        chalk.cyan('Name'),
        chalk.cyan('SKU'),
        chalk.cyan('Units Sold'),
        chalk.cyan('Revenue')
      ],
      colWidths: [8, 35, 18, 12, 15]
    });

    products.forEach((product, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      
      table.push([
        chalk.yellow(medal),
        chalk.white(product.name.substring(0, 32)),
        chalk.gray(product.sku),
        chalk.yellow(product.salesStats.totalSold),
        chalk.green(`$${product.salesStats.revenue.toFixed(2)}`)
      ]);
    });

    console.log(table.toString() + '\n');
  }

  /**
   * Display low stock alert
   */
  displayLowStockAlert(products) {
    if (!products || products.length === 0) {
      console.log(chalk.green('\n✅ All products have sufficient stock\n'));
      return;
    }

    console.log(chalk.yellow('\n⚠️  LOW STOCK ALERT'));
    console.log(chalk.yellow('═'.repeat(70)));

    const table = new Table({
      head: [
        chalk.cyan('SKU'),
        chalk.cyan('Name'),
        chalk.cyan('Available'),
        chalk.cyan('Reorder Point'),
        chalk.cyan('Action')
      ],
      colWidths: [18, 32, 12, 15, 15]
    });

    products.forEach(product => {
      const urgency = product.inventory.available === 0 ? chalk.red('URGENT!') :
                     product.inventory.available < 5 ? chalk.red('Critical') :
                     chalk.yellow('Low');

      table.push([
        chalk.white(product.sku),
        chalk.white(product.name.substring(0, 30)),
        chalk.red(product.inventory.available),
        chalk.gray(product.inventory.reorderPoint),
        urgency
      ]);
    });

    console.log('\n' + table.toString() + '\n');
  }

  /**
   * Display success message
   */
  displaySuccess(message) {
    console.log(chalk.green(`\n✅ ${message}\n`));
  }

  /**
   * Display error message
   */
  displayError(message) {
    console.log(chalk.red(`\n❌ ${message}\n`));
  }

  /**
   * Display warning message
   */
  displayWarning(message) {
    console.log(chalk.yellow(`\n⚠️  ${message}\n`));
  }

  /**
   * Display info message
   */
  displayInfo(message) {
    console.log(chalk.blue(`\nℹ️  ${message}\n`));
  }

  /**
   * Get status badge
   */
  getStatusBadge(status) {
    const badges = {
      'AVAILABLE': chalk.green('● AVAILABLE'),
      'OUT_OF_STOCK': chalk.red('● OUT OF STOCK'),
      'DISCONTINUED': chalk.gray('● DISCONTINUED'),
      'COMING_SOON': chalk.blue('● COMING SOON')
    };
    return badges[status] || chalk.gray('● UNKNOWN');
  }

  /**
   * Get stock color
   */
  getStockColor(stock) {
    if (stock === 0) return chalk.red.bold(stock);
    if (stock < 10) return chalk.yellow(stock);
    return chalk.green(stock);
  }

  /**
   * Get star rating
   */
  getStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    let stars = chalk.yellow('★'.repeat(fullStars));
    if (halfStar) stars += chalk.yellow('☆');
    stars += chalk.gray('☆'.repeat(emptyStars));
    
    return stars + chalk.white(` ${rating.toFixed(1)}`);
  }

  /**
   * Clear screen
   */
  clearScreen() {
    console.clear();
  }

  /**
   * Display loading spinner
   */
  showLoading(message = 'Loading...') {
    const ora = require('ora');
    return ora(message).start();
  }

  /**
   * Pause and wait for user
   */
  async pause() {
    const inquirer = require('inquirer');
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }]);
  }
}

module.exports = new DisplayHelper();