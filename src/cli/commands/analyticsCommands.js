/**
 * Analytics Commands
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const analyticsService = require('../../services/AnalyticsService');
const display = require('../helpers/display');
const Table = require('cli-table3');
const dayjs = require('dayjs');

class AnalyticsCommands {
  /**
   * View dashboard summary
   */
  async viewDashboard() {
    try {
      display.clearScreen();
      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  DASHBOARD SUMMARY'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      const spinner = display.showLoading('Loading dashboard data...');
      const summary = await analyticsService.getDashboardSummary();
      spinner.stop();

      // Product Stats
      console.log(chalk.yellow.bold('📦 PRODUCTS'));
      console.log(chalk.gray('  Total Products:     ') + chalk.white(summary.products.totalProducts || 0));
      console.log(chalk.gray('  Inventory Value:    ') + chalk.green(`$${(summary.products.totalValue || 0).toFixed(2)}`));
      console.log(chalk.gray('  Low Stock Items:    ') + chalk.yellow(summary.products.lowStockCount || 0));
      console.log(chalk.gray('  Out of Stock:       ') + chalk.red(summary.products.outOfStockCount || 0));

      // Order Stats
      console.log(chalk.yellow.bold('\n🛒 ORDERS'));
      console.log(chalk.gray('  Total Orders:       ') + chalk.white(summary.orders.totalOrders || 0));
      console.log(chalk.gray('  Total Revenue:      ') + chalk.green.bold(`$${(summary.orders.totalRevenue || 0).toFixed(2)}`));
      console.log(chalk.gray('  Pending Orders:     ') + chalk.yellow(summary.orders.pendingOrders || 0));
      console.log(chalk.gray('  Completed Orders:   ') + chalk.green(summary.orders.completedOrders || 0));

      // Monthly Stats
      console.log(chalk.yellow.bold('\n📅 THIS MONTH'));
      console.log(chalk.gray('  Revenue:            ') + chalk.green(`$${summary.monthlyRevenue.revenue.toFixed(2)}`));
      console.log(chalk.gray('  Orders:             ') + chalk.white(summary.monthlyRevenue.orderCount));
      
      if (summary.monthlyRevenue.orderCount > 0) {
        const avgOrder = summary.monthlyRevenue.revenue / summary.monthlyRevenue.orderCount;
        console.log(chalk.gray('  Avg Order Value:    ') + chalk.green(`$${avgOrder.toFixed(2)}`));
      }

      // Top Products
      if (summary.topProducts.length > 0) {
        console.log(chalk.yellow.bold('\n🏆 TOP 5 PRODUCTS'));
        summary.topProducts.forEach((product, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          console.log(chalk.gray(`  ${medal} ${product.name.substring(0, 35).padEnd(35)}`), 
                     chalk.yellow(`${product.salesStats.totalSold} sold`), 
                     chalk.green(`$${product.salesStats.revenue.toFixed(2)}`));
        });
      }

      console.log('');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * View sales report
   */
  async viewSalesReport() {
    try {
      display.clearScreen();
      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  SALES REPORT'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      const { period } = await inquirer.prompt([{
        type: 'list',
        name: 'period',
        message: 'Select period:',
        choices: [
          { name: 'Today', value: 'today' },
          { name: 'This Week', value: 'week' },
          { name: 'This Month', value: 'month' },
          { name: 'This Year', value: 'year' },
          { name: 'Custom Range', value: 'custom' }
        ]
      }]);

      let startDate, endDate;
      if (period === 'custom') {
        const dates = await inquirer.prompt([
          {
            type: 'input',
            name: 'startDate',
            message: 'Start Date (YYYY-MM-DD):',
            validate: input => dayjs(input).isValid() || 'Invalid date format'
          },
          {
            type: 'input',
            name: 'endDate',
            message: 'End Date (YYYY-MM-DD):',
            validate: input => dayjs(input).isValid() || 'Invalid date format'
          }
        ]);
        startDate = dates.startDate;
        endDate = dates.endDate;
      }

      const spinner = display.showLoading('Generating report...');
      const sales = await analyticsService.getSalesByPeriod(period, startDate, endDate);
      spinner.stop();

      if (sales.length === 0) {
        display.displayInfo('No sales data for selected period');
        return;
      }

      const table = new Table({
        head: [
          chalk.cyan('Date'),
          chalk.cyan('Orders'),
          chalk.cyan('Revenue'),
          chalk.cyan('Avg Order')
        ],
        colWidths: [15, 10, 15, 15]
      });

      let totalRevenue = 0;
      let totalOrders = 0;

      sales.forEach(day => {
        const date = `${day._id.year}-${String(day._id.month).padStart(2, '0')}-${String(day._id.day).padStart(2, '0')}`;
        const avgOrder = day.revenue / day.orderCount;
        
        table.push([
          chalk.white(date),
          chalk.yellow(day.orderCount),
          chalk.green(`$${day.revenue.toFixed(2)}`),
          chalk.green(`$${avgOrder.toFixed(2)}`)
        ]);

        totalRevenue += day.revenue;
        totalOrders += day.orderCount;
      });

      console.log(table.toString());
      console.log('');
      console.log(chalk.gray('  Total Revenue: ') + chalk.green.bold(`$${totalRevenue.toFixed(2)}`));
      console.log(chalk.gray('  Total Orders:  ') + chalk.white(totalOrders));
      console.log(chalk.gray('  Avg Per Day:   ') + chalk.green(`$${(totalRevenue / sales.length).toFixed(2)}`));
      console.log('');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * View category performance
   */
  async viewCategoryPerformance() {
    try {
      display.clearScreen();
      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  CATEGORY PERFORMANCE'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      const spinner = display.showLoading('Analyzing categories...');
      const categories = await analyticsService.getCategoryPerformance();
      spinner.stop();

      if (categories.length === 0) {
        display.displayInfo('No category data available');
        return;
      }

      const table = new Table({
        head: [
          chalk.cyan('Category'),
          chalk.cyan('Products'),
          chalk.cyan('Units Sold'),
          chalk.cyan('Revenue'),
          chalk.cyan('Avg Price')
        ],
        colWidths: [25, 12, 12, 15, 12]
      });

      categories.forEach(cat => {
        table.push([
          chalk.white(cat.categoryName),
          chalk.white(cat.productCount),
          chalk.yellow(cat.totalSold || 0),
          chalk.green(`$${(cat.totalRevenue || 0).toFixed(2)}`),
          chalk.green(`$${(cat.avgPrice || 0).toFixed(2)}`)
        ]);
      });

      console.log(table.toString() + '\n');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * View customer analytics
   */
  async viewCustomerAnalytics() {
    try {
      display.clearScreen();
      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  TOP CUSTOMERS'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      const spinner = display.showLoading('Loading customer data...');
      const customers = await analyticsService.getCustomerAnalytics();
      spinner.stop();

      if (customers.length === 0) {
        display.displayInfo('No customer data available');
        return;
      }

      const table = new Table({
        head: [
          chalk.cyan('Name'),
          chalk.cyan('Email'),
          chalk.cyan('Orders'),
          chalk.cyan('Total Spent'),
          chalk.cyan('Wishlist')
        ],
        colWidths: [25, 30, 10, 15, 10]
      });

      customers.forEach(customer => {
        table.push([
          chalk.white(`${customer.firstName} ${customer.lastName}`),
          chalk.gray(customer.email),
          chalk.yellow(customer.orderStats?.totalOrders || 0),
          chalk.green(`$${(customer.orderStats?.totalSpent || 0).toFixed(2)}`),
          chalk.white(customer.wishlistCount)
        ]);
      });

      console.log(table.toString() + '\n');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * View inventory value
   */
  async viewInventoryValue() {
    try {
      const spinner = display.showLoading('Calculating inventory value...');
      const inventory = await analyticsService.getInventoryValue();
      spinner.stop();

      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  INVENTORY VALUE'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      const table = new Table({
        head: [],
        colWidths: [35, 35]
      });

      table.push(
        [chalk.gray('Cost Value (What we paid):'), chalk.yellow(`$${(inventory.totalValue || 0).toFixed(2)}`)],
        [chalk.gray('Retail Value (What we can sell for):'), chalk.green.bold(`$${(inventory.totalRetailValue || 0).toFixed(2)}`)],
        [chalk.gray('Potential Profit:'), chalk.green(`$${((inventory.totalRetailValue || 0) - (inventory.totalValue || 0)).toFixed(2)}`)],
        [chalk.gray('Total Items in Stock:'), chalk.white(inventory.totalItems || 0)]
      );

      console.log(table.toString());

      if (inventory.totalValue > 0 && inventory.totalRetailValue > 0) {
        const margin = ((inventory.totalRetailValue - inventory.totalValue) / inventory.totalRetailValue * 100);
        console.log(chalk.gray('\n  Profit Margin: ') + chalk.green(`${margin.toFixed(2)}%`));
      }

      console.log('');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * View revenue trends
   */
  async viewRevenueTrends() {
    try {
      const spinner = display.showLoading('Loading revenue trends...');
      const trends = await analyticsService.getRevenueTrends();
      spinner.stop();

      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  REVENUE TRENDS (Last 7 Days)'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      if (trends.length === 0) {
        display.displayInfo('No revenue data for last 7 days');
        return;
      }

      const table = new Table({
        head: [
          chalk.cyan('Date'),
          chalk.cyan('Orders'),
          chalk.cyan('Revenue'),
          chalk.cyan('Graph')
        ],
        colWidths: [15, 10, 15, 25]
      });

      const maxRevenue = Math.max(...trends.map(t => t.revenue));

      trends.forEach(day => {
        const barLength = Math.round((day.revenue / maxRevenue) * 20);
        const bar = '█'.repeat(barLength);
        
        table.push([
          chalk.white(day.date),
          chalk.yellow(day.orders),
          chalk.green(`$${day.revenue.toFixed(2)}`),
          chalk.green(bar)
        ]);
      });

      console.log(table.toString());

      const totalRevenue = trends.reduce((sum, t) => sum + t.revenue, 0);
      const totalOrders = trends.reduce((sum, t) => sum + t.orders, 0);

      console.log('');
      console.log(chalk.gray('  7-Day Total:  ') + chalk.green.bold(`$${totalRevenue.toFixed(2)}`));
      console.log(chalk.gray('  Total Orders: ') + chalk.white(totalOrders));
      console.log(chalk.gray('  Daily Avg:    ') + chalk.green(`$${(totalRevenue / 7).toFixed(2)}`));
      console.log('');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * View inventory turnover
   */
  async viewInventoryTurnover() {
    try {
      const spinner = display.showLoading('Calculating inventory turnover...');
      const products = await analyticsService.getInventoryTurnover();
      spinner.stop();

      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  INVENTORY TURNOVER'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      if (products.length === 0) {
        display.displayInfo('No turnover data available');
        return;
      }

      const table = new Table({
        head: [
          chalk.cyan('Product'),
          chalk.cyan('Sold'),
          chalk.cyan('Stock'),
          chalk.cyan('Turnover Rate')
        ],
        colWidths: [35, 10, 10, 15]
      });

      products.forEach(product => {
        const rateColor = product.turnoverRate > 2 ? chalk.green :
                         product.turnoverRate > 1 ? chalk.yellow :
                         chalk.red;

        table.push([
          chalk.white(product.name.substring(0, 33)),
          chalk.yellow(product.totalSold),
          chalk.white(product.currentStock),
          rateColor(`${product.turnoverRate.toFixed(2)}x`)
        ]);
      });

      console.log(table.toString());
      console.log('');
      console.log(chalk.gray('  💡 Higher turnover rate = Better sales velocity'));
      console.log('');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * View order status distribution
   */
  async viewOrderStatusDistribution() {
    try {
      const spinner = display.showLoading('Loading order status data...');
      const distribution = await analyticsService.getOrderStatusDistribution();
      spinner.stop();

      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  ORDER STATUS DISTRIBUTION'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      const table = new Table({
        head: [
          chalk.cyan('Status'),
          chalk.cyan('Count'),
          chalk.cyan('Total Value'),
          chalk.cyan('Percentage')
        ],
        colWidths: [20, 10, 15, 12]
      });

      const totalCount = distribution.reduce((sum, d) => sum + d.count, 0);

      distribution.forEach(item => {
        const percentage = (item.count / totalCount * 100).toFixed(1);
        
        table.push([
          chalk.white(item._id),
          chalk.yellow(item.count),
          chalk.green(`$${item.totalValue.toFixed(2)}`),
          chalk.cyan(`${percentage}%`)
        ]);
      });

      console.log(table.toString() + '\n');

    } catch (error) {
      display.displayError(error.message);
    }
  }
}

module.exports = new AnalyticsCommands();