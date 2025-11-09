/**
 * Order Commands - FIXED
 * 
 * Fixes:
 * - Show valid status transitions only
 * - Better error messages
 * - Proper spinner handling
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const orderService = require('../../services/OrderService');
const userService = require('../../services/UserService');
const productService = require('../../services/ProductService');
const display = require('../helpers/display');
const { ORDER_STATUS } = require('../../config/constants');
const Table = require('cli-table3');

class OrderCommands {
  /**
   * Get valid next statuses based on current status
   */
  getValidNextStatuses(currentStatus) {
    const validTransitions = {
      [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.REFUNDED],
      [ORDER_STATUS.CANCELLED]: [],
      [ORDER_STATUS.REFUNDED]: []
    };

    return validTransitions[currentStatus] || [];
  }

  /**
   * Create new order
   */
  async createOrder() {
    try {
      display.clearScreen();
      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  CREATE NEW ORDER'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      // Step 1: Get user
      const { userEmail } = await inquirer.prompt([{
        type: 'input',
        name: 'userEmail',
        message: 'Customer Email:',
        validate: input => input.includes('@') || 'Invalid email'
      }]);

      const user = await userService.getUserByEmail(userEmail);
      
      console.log(chalk.green(`\n✓ Customer: ${user.firstName} ${user.lastName}`));

      // Step 2: Add products to cart
      const items = [];
      let addMore = true;

      while (addMore) {
        const { productId, quantity } = await inquirer.prompt([
          {
            type: 'input',
            name: 'productId',
            message: 'Product ID (24 characters):',
            validate: input => {
              if (input.length !== 24) return 'Product ID must be 24 characters';
              if (!/^[a-fA-F0-9]{24}$/.test(input)) return 'Invalid ID format';
              return true;
            }
          },
          {
            type: 'number',
            name: 'quantity',
            message: 'Quantity:',
            default: 1,
            validate: input => input > 0 || 'Quantity must be positive'
          }
        ]);

        // Verify product
        const product = await productService.getProductById(productId);
        
        items.push({
          productId,
          quantity,
          price: product.price
        });

        console.log(chalk.green(`✓ Added: ${product.name} x${quantity}`));

        const { more } = await inquirer.prompt([{
          type: 'confirm',
          name: 'more',
          message: 'Add more products?',
          default: false
        }]);

        addMore = more;
      }

      // Step 3: Shipping address
      const shippingAddress = await inquirer.prompt([
        {
          type: 'input',
          name: 'street',
          message: 'Street Address:',
          validate: input => input.length > 0 || 'Required'
        },
        {
          type: 'input',
          name: 'city',
          message: 'City:',
          validate: input => input.length > 0 || 'Required'
        },
        {
          type: 'input',
          name: 'state',
          message: 'State:',
          validate: input => input.length > 0 || 'Required'
        },
        {
          type: 'input',
          name: 'postalCode',
          message: 'Postal Code:',
          validate: input => input.length > 0 || 'Required'
        },
        {
          type: 'input',
          name: 'country',
          message: 'Country:',
          default: 'USA'
        }
      ]);

      // Step 4: Payment method
      const { paymentMethod } = await inquirer.prompt([{
        type: 'list',
        name: 'paymentMethod',
        message: 'Payment Method:',
        choices: ['CARD', 'COD', 'UPI', 'NET_BANKING']
      }]);

      // Step 5: Create order
      const orderData = {
        userId: user._id.toString(),
        customer: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || ''
        },
        items,
        shippingAddress,
        billingAddress: shippingAddress,
        payment: {
          method: paymentMethod
        },
        shipping: {
          method: 'STANDARD'
        }
      };

      const spinner = display.showLoading('Creating order...');
      const order = await orderService.createOrder(orderData);
      spinner.succeed('Order created successfully!');

      this.displayOrderDetails(order);

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * View order details
   */
  async viewOrder() {
    try {
      const { orderInput } = await inquirer.prompt([{
        type: 'input',
        name: 'orderInput',
        message: 'Enter Order Number or Order ID:',
        validate: input => input.length > 0 || 'Required'
      }]);

      const spinner = display.showLoading('Loading order...');
      
      let order;
      try {
        if (orderInput.startsWith('ORD-')) {
          order = await orderService.getOrderByNumber(orderInput);
        } else {
          order = await orderService.getOrderById(orderInput);
        }
        spinner.succeed('Order loaded');
      } catch (error) {
        spinner.fail('Failed to load order');
        throw error;
      }

      this.displayOrderDetails(order);

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * Display order details
   */
  displayOrderDetails(order) {
    console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold.white(`  ORDER: ${order.orderNumber}`.padEnd(68)) + chalk.cyan('║'));
    console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

    console.log(chalk.gray('  Order ID:     ') + chalk.white(order._id));
    console.log(chalk.gray('  Status:       ') + this.getStatusBadge(order.status));
    console.log(chalk.gray('  Created:      ') + chalk.white(new Date(order.createdAt).toLocaleString()));

    console.log(chalk.gray('\n  Customer:'));
    console.log(chalk.gray('    Name:       ') + chalk.white(`${order.customer.firstName} ${order.customer.lastName}`));
    console.log(chalk.gray('    Email:      ') + chalk.white(order.customer.email));

    console.log(chalk.gray('\n  Items:'));
    const itemTable = new Table({
      head: [chalk.cyan('Product'), chalk.cyan('Qty'), chalk.cyan('Price'), chalk.cyan('Subtotal')],
      colWidths: [35, 8, 12, 12]
    });

    order.items.forEach(item => {
      itemTable.push([
        chalk.white(item.name),
        chalk.white(item.quantity),
        chalk.green(`$${item.price.toFixed(2)}`),
        chalk.green(`$${item.subtotal.toFixed(2)}`)
      ]);
    });

    console.log(itemTable.toString());

    console.log(chalk.gray('\n  Pricing:'));
    console.log(chalk.gray('    Subtotal:   ') + chalk.white(`$${order.pricing.subtotal.toFixed(2)}`));
    console.log(chalk.gray('    Tax:        ') + chalk.white(`$${order.pricing.tax.toFixed(2)}`));
    console.log(chalk.gray('    Shipping:   ') + chalk.white(`$${order.pricing.shipping.toFixed(2)}`));
    console.log(chalk.gray('    Total:      ') + chalk.green.bold(`$${order.pricing.total.toFixed(2)}`));

    console.log(chalk.gray('\n  Shipping Address:'));
    console.log(chalk.white(`    ${order.shippingAddress.street}`));
    console.log(chalk.white(`    ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`));
    console.log(chalk.white(`    ${order.shippingAddress.country}`));
    console.log('');
  }

  /**
   * Update order status - FIXED: Show only valid transitions
   */
  async updateOrderStatus() {
    const spinner = display.showLoading('Loading order...');
    
    try {
      const { orderInput } = await inquirer.prompt([{
        type: 'input',
        name: 'orderInput',
        message: 'Enter Order Number or ID:',
        validate: input => input.length > 0 || 'Required'
      }]);

      // Load order
      let order;
      if (orderInput.startsWith('ORD-')) {
        order = await orderService.getOrderByNumber(orderInput);
      } else {
        order = await orderService.getOrderById(orderInput);
      }
      spinner.succeed('Order loaded');

      console.log(chalk.white(`\nCurrent Status: `) + this.getStatusBadge(order.status));

      // Get valid next statuses
      const validStatuses = this.getValidNextStatuses(order.status);

      if (validStatuses.length === 0) {
        display.displayWarning(`Order status ${order.status} cannot be changed anymore.`);
        return;
      }

      console.log(chalk.yellow(`\n✓ Valid transitions from ${order.status}:`));
      validStatuses.forEach(status => {
        console.log(chalk.gray(`  → ${status}`));
      });
      console.log('');

      const { newStatus, note } = await inquirer.prompt([
        {
          type: 'list',
          name: 'newStatus',
          message: 'New Status:',
          choices: validStatuses
        },
        {
          type: 'input',
          name: 'note',
          message: 'Note (optional):',
          default: ''
        }
      ]);

      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Update status from ${order.status} to ${newStatus}?`,
        default: true
      }]);

      if (!confirm) {
        display.displayInfo('Update cancelled');
        return;
      }

      const updateSpinner = display.showLoading('Updating status...');
      const updatedOrder = await orderService.updateOrderStatus(
        order._id.toString(),
        newStatus,
        note,
        'ADMIN'
      );
      updateSpinner.succeed('Status updated successfully!');

      this.displayOrderDetails(updatedOrder);

    } catch (error) {
      spinner.fail('Operation failed');
      display.displayError(error.message);
    }
  }

  /**
   * List orders
   */
  async listOrders() {
    try {
      const { status } = await inquirer.prompt([{
        type: 'list',
        name: 'status',
        message: 'Filter by status:',
        choices: [
          { name: 'All Orders', value: null },
          ...Object.values(ORDER_STATUS).map(s => ({ name: s, value: s }))
        ]
      }]);

      const spinner = display.showLoading('Loading orders...');
      
      let orders;
      if (status) {
        orders = await orderService.getOrdersByStatus(status, { limit: 20 });
      } else {
        const result = await orderService.searchOrders({ limit: 20 });
        orders = result.orders;
      }
      
      spinner.stop();

      if (orders.length === 0) {
        display.displayInfo('No orders found');
        return;
      }

      const table = new Table({
        head: [
          chalk.cyan('Order #'),
          chalk.cyan('Customer'),
          chalk.cyan('Items'),
          chalk.cyan('Total'),
          chalk.cyan('Status'),
          chalk.cyan('Date')
        ],
        colWidths: [20, 25, 8, 12, 15, 12]
      });

      orders.forEach(order => {
        table.push([
          chalk.white(order.orderNumber),
          chalk.white(`${order.customer.firstName} ${order.customer.lastName}`),
          chalk.white(order.items.length),
          chalk.green(`$${order.pricing.total.toFixed(2)}`),
          this.getStatusBadge(order.status),
          chalk.gray(new Date(order.createdAt).toLocaleDateString())
        ]);
      });

      console.log('\n' + table.toString() + '\n');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder() {
    try {
      const { orderInput, reason } = await inquirer.prompt([
        {
          type: 'input',
          name: 'orderInput',
          message: 'Enter Order Number or ID:',
          validate: input => input.length > 0 || 'Required'
        },
        {
          type: 'input',
          name: 'reason',
          message: 'Cancellation Reason:',
          default: 'Customer request'
        }
      ]);

      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: chalk.red('Are you sure you want to cancel this order?'),
        default: false
      }]);

      if (!confirm) {
        display.displayInfo('Cancellation aborted');
        return;
      }

      const spinner = display.showLoading('Cancelling order...');
      
      let orderId;
      if (orderInput.startsWith('ORD-')) {
        const order = await orderService.getOrderByNumber(orderInput);
        orderId = order._id.toString();
      } else {
        orderId = orderInput;
      }

      await orderService.cancelOrder(orderId, reason, 'ADMIN');
      spinner.succeed('Order cancelled successfully!');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * View order statistics
   */
  async viewOrderStats() {
    try {
      const spinner = display.showLoading('Calculating statistics...');
      const stats = await orderService.getOrderStats();
      spinner.stop();

      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  ORDER STATISTICS'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      const table = new Table({
        head: [],
        colWidths: [35, 35]
      });

      table.push(
        [chalk.gray('Total Orders:'), chalk.white(stats.totalOrders || 0)],
        [chalk.gray('Total Revenue:'), chalk.green.bold(`$${(stats.totalRevenue || 0).toFixed(2)}`)],
        [chalk.gray('Average Order Value:'), chalk.green(`$${(stats.averageOrderValue || 0).toFixed(2)}`)],
        [chalk.gray('Pending Orders:'), chalk.yellow(stats.pendingOrders || 0)],
        [chalk.gray('Completed Orders:'), chalk.green(stats.completedOrders || 0)]
      );

      console.log(table.toString() + '\n');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * Get status badge
   */
  getStatusBadge(status) {
    const badges = {
      [ORDER_STATUS.PENDING]: chalk.yellow('● PENDING'),
      [ORDER_STATUS.CONFIRMED]: chalk.blue('● CONFIRMED'),
      [ORDER_STATUS.PROCESSING]: chalk.cyan('● PROCESSING'),
      [ORDER_STATUS.SHIPPED]: chalk.magenta('● SHIPPED'),
      [ORDER_STATUS.DELIVERED]: chalk.green('● DELIVERED'),
      [ORDER_STATUS.CANCELLED]: chalk.red('● CANCELLED'),
      [ORDER_STATUS.REFUNDED]: chalk.gray('● REFUNDED')
    };
    return badges[status] || chalk.gray('● UNKNOWN');
  }
}

module.exports = new OrderCommands();