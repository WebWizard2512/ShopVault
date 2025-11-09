const inquirer = require('inquirer');
const chalk = require('chalk');
const userService = require('../../services/UserService');
const display = require('../helpers/display');
const { USER_ROLES } = require('../../config/constants');
const Table = require('cli-table3');

class UserCommands {
  async createUser() {
    try {
      display.clearScreen();
      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  CREATE NEW USER'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'firstName',
          message: 'First Name:',
          validate: input => input.length >= 2 || 'First name must be at least 2 characters'
        },
        {
          type: 'input',
          name: 'lastName',
          message: 'Last Name:',
          validate: input => input.length >= 2 || 'Last name must be at least 2 characters'
        },
        {
          type: 'input',
          name: 'email',
          message: 'Email:',
          validate: input => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(input) || 'Invalid email format';
          }
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*',
          validate: input => input.length >= 6 || 'Password must be at least 6 characters'
        },
        {
          type: 'input',
          name: 'phone',
          message: 'Phone (optional):',
          default: ''
        },
        {
          type: 'list',
          name: 'role',
          message: 'Role:',
          choices: Object.values(USER_ROLES),
          default: USER_ROLES.CUSTOMER
        }
      ]);

      const spinner = display.showLoading('Creating user...');
      const user = await userService.createUser(answers);
      spinner.succeed('User created successfully!');

      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  USER DETAILS'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      console.log(chalk.gray('  ID:       ') + chalk.white(user._id));
      console.log(chalk.gray('  Name:     ') + chalk.white(`${user.firstName} ${user.lastName}`));
      console.log(chalk.gray('  Email:    ') + chalk.white(user.email));
      console.log(chalk.gray('  Role:     ') + chalk.white(user.role));
      console.log('');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  async listUsers() {
    try {
      display.clearScreen();
      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  ALL USERS'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      const spinner = display.showLoading('Loading users...');
      const result = await userService.searchUsers({ limit: 100 });
      spinner.stop();

      if (result.total === 0) {
        display.displayWarning('No users found.');
        return;
      }

      const table = new Table({
        head: [
          chalk.cyan('ID'),
          chalk.cyan('Name'),
          chalk.cyan('Email'),
          chalk.cyan('Role'),
          chalk.cyan('Orders'),
          chalk.cyan('Status')
        ],
        colWidths: [26, 25, 30, 12, 10, 10]
      });

      result.users.forEach(user => {
        table.push([
          chalk.gray(user._id.toString().slice(-8)),
          chalk.white(`${user.firstName} ${user.lastName}`),
          chalk.white(user.email),
          chalk.yellow(user.role),
          chalk.green(user.orderStats?.totalOrders || 0),
          user.isActive ? chalk.green('✓') : chalk.red('✗')
        ]);
      });

      console.log(table.toString() + '\n');
      console.log(chalk.gray(`  Total: ${result.total} users\n`));

    } catch (error) {
      display.displayError(error.message);
    }
  }

  async viewUser() {
    try {
      const { userId } = await inquirer.prompt([{
        type: 'input',
        name: 'userId',
        message: 'Enter User ID or Email:',
        validate: input => input.length > 0 || 'User ID/Email is required'
      }]);

      const spinner = display.showLoading('Loading user...');
      
      let user;
      if (userId.includes('@')) {
        user = await userService.getUserByEmail(userId);
      } else {
        user = await userService.getUserById(userId);
      }
      
      spinner.stop();

      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  USER DETAILS'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      console.log(chalk.gray('  ID:           ') + chalk.white(user._id));
      console.log(chalk.gray('  Name:         ') + chalk.white(`${user.firstName} ${user.lastName}`));
      console.log(chalk.gray('  Email:        ') + chalk.white(user.email));
      console.log(chalk.gray('  Phone:        ') + chalk.white(user.phone || 'N/A'));
      console.log(chalk.gray('  Role:         ') + chalk.white(user.role));
      console.log(chalk.gray('  Status:       ') + (user.isActive ? chalk.green('Active') : chalk.red('Inactive')));
      console.log(chalk.gray('  Verified:     ') + (user.isVerified ? chalk.green('Yes') : chalk.yellow('No')));

      console.log(chalk.gray('\n  Order Statistics:'));
      console.log(chalk.gray('    Total Orders: ') + chalk.white(user.orderStats?.totalOrders || 0));
      console.log(chalk.gray('    Total Spent:  ') + chalk.green(`$${(user.orderStats?.totalSpent || 0).toFixed(2)}`));
      
      if (user.orderStats?.lastOrderDate) {
        console.log(chalk.gray('    Last Order:   ') + chalk.white(new Date(user.orderStats.lastOrderDate).toLocaleDateString()));
      }

      console.log(chalk.gray('\n  Wishlist:       ') + chalk.white(`${user.wishlist?.length || 0} items`));
      console.log(chalk.gray('  Addresses:      ') + chalk.white(`${user.addresses?.length || 0} saved`));
      console.log('');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  async manageWishlist() {
    try {
      const { userId } = await inquirer.prompt([{
        type: 'input',
        name: 'userId',
        message: 'Enter User ID:',
        validate: input => input.length > 0 || 'User ID is required'
      }]);

      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Select action:',
        choices: [
          { name: '📋 View Wishlist', value: 'view' },
          { name: '➕ Add Product', value: 'add' },
          { name: '➖ Remove Product', value: 'remove' },
          { name: '🔙 Back', value: 'back' }
        ]
      }]);

      if (action === 'back') return;

      switch (action) {
        case 'view':
          await this.viewWishlist(userId);
          break;
        case 'add':
          await this.addToWishlist(userId);
          break;
        case 'remove':
          await this.removeFromWishlist(userId);
          break;
      }

    } catch (error) {
      display.displayError(error.message);
    }
  }

  async viewWishlist(userId) {
    try {
      const spinner = display.showLoading('Loading wishlist...');
      const wishlist = await userService.getWishlistWithProducts(userId);
      spinner.stop();

      if (wishlist.length === 0) {
        display.displayInfo('Wishlist is empty');
        return;
      }

      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  WISHLIST'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      const table = new Table({
        head: [
          chalk.cyan('Product'),
          chalk.cyan('Price'),
          chalk.cyan('Stock'),
          chalk.cyan('Added On')
        ],
        colWidths: [35, 12, 10, 15]
      });

      wishlist.forEach(item => {
        table.push([
          chalk.white(item.product.name),
          chalk.green(`$${item.product.price.toFixed(2)}`),
          chalk.white(item.product.inventory.available),
          chalk.gray(new Date(item.addedAt).toLocaleDateString())
        ]);
      });

      console.log(table.toString() + '\n');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  async addToWishlist(userId) {
    try {
      const { productId } = await inquirer.prompt([{
        type: 'input',
        name: 'productId',
        message: 'Enter Product ID:',
        validate: input => input.length > 0 || 'Product ID is required'
      }]);

      const spinner = display.showLoading('Adding to wishlist...');
      await userService.addToWishlist(userId, productId);
      spinner.succeed('Added to wishlist!');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  async removeFromWishlist(userId) {
    try {
      const { productId } = await inquirer.prompt([{
        type: 'input',
        name: 'productId',
        message: 'Enter Product ID to remove:',
        validate: input => input.length > 0 || 'Product ID is required'
      }]);

      const spinner = display.showLoading('Removing from wishlist...');
      await userService.removeFromWishlist(userId, productId);
      spinner.succeed('Removed from wishlist!');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  async viewUserStats() {
    try {
      const spinner = display.showLoading('Calculating statistics...');
      const stats = await userService.getUserStats();
      spinner.stop();

      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  USER STATISTICS'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      const table = new Table({
        head: [],
        colWidths: [35, 35]
      });

      table.push(
        [chalk.gray('Total Users:'), chalk.white(stats.totalUsers)],
        [chalk.gray('Total Customers:'), chalk.white(stats.totalCustomers)],
        [chalk.gray('Total Admins:'), chalk.white(stats.totalAdmins)],
        [chalk.gray('Verified Users:'), chalk.green(stats.verifiedUsers)],
        [chalk.gray('Active Users:'), chalk.green(stats.activeUsers)]
      );

      console.log(table.toString() + '\n');

    } catch (error) {
      display.displayError(error.message);
    }
  }
}

module.exports = new UserCommands();