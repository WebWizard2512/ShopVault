/**
 * Product Commands - CLI Operations
 * 
 * LEARNING NOTES - CLI DESIGN:
 * Good CLI is about UX:
 * - Clear prompts
 * - Validation feedback
 * - Progress indicators
 * - Beautiful output
 */

const inquirer = require('inquirer');
const productService = require('../../services/ProductService');
const categoryService = require('../../services/CategoryService');
const display = require('../helpers/display');
const logger = require('../../utils/logger');
const { PRODUCT_STATUS } = require('../../config/constants');

class ProductCommands {
  /**
   * Create new product
   */
  async createProduct() {
    try {
      display.clearScreen();
      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  CREATE NEW PRODUCT'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      // Get categories for selection
      const categories = await categoryService.getRootCategories();
      const categoryChoices = categories.map(cat => ({
        name: cat.name,
        value: cat._id.toString()
      }));

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Product Name:',
          validate: input => input.length >= 3 || 'Name must be at least 3 characters'
        },
        {
          type: 'input',
          name: 'sku',
          message: 'SKU (uppercase):',
          validate: input => /^[A-Z0-9-]+$/.test(input) || 'SKU must contain only uppercase letters, numbers, and hyphens',
          filter: input => input.toUpperCase()
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description:',
          validate: input => input.length >= 10 || 'Description must be at least 10 characters'
        },
        {
          type: 'number',
          name: 'price',
          message: 'Price ($):',
          validate: input => input > 0 || 'Price must be positive'
        },
        {
          type: 'number',
          name: 'cost',
          message: 'Cost Price ($):',
          default: 0
        },
        {
          type: 'list',
          name: 'categoryId',
          message: 'Category:',
          choices: categoryChoices
        },
        {
          type: 'input',
          name: 'brand',
          message: 'Brand:',
          default: ''
        },
        {
          type: 'input',
          name: 'tags',
          message: 'Tags (comma-separated):',
          filter: input => input.split(',').map(t => t.trim()).filter(t => t)
        },
        {
          type: 'number',
          name: 'quantity',
          message: 'Initial Stock Quantity:',
          default: 0,
          validate: input => input >= 0 || 'Quantity cannot be negative'
        },
        {
          type: 'confirm',
          name: 'isFeatured',
          message: 'Feature this product?',
          default: false
        }
      ]);

      // Prepare product data
      const productData = {
        ...answers,
        inventory: {
          quantity: answers.quantity
        }
      };

      delete productData.quantity;

      // Create product
      const spinner = display.showLoading('Creating product...');
      const product = await productService.createProduct(productData);
      spinner.succeed('Product created successfully!');

      display.displayProductDetails(product);

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * Search products
   */
  async searchProducts() {
    try {
      display.clearScreen();
      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('  SEARCH PRODUCTS'.padEnd(68)) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'query',
          message: 'Search query (name, description):',
          default: ''
        },
        {
          type: 'number',
          name: 'minPrice',
          message: 'Minimum price (leave empty to skip):',
          default: null
        },
        {
          type: 'number',
          name: 'maxPrice',
          message: 'Maximum price (leave empty to skip):',
          default: null
        },
        {
          type: 'list',
          name: 'status',
          message: 'Product status:',
          choices: [
            { name: 'All', value: null },
            ...Object.values(PRODUCT_STATUS).map(s => ({ name: s, value: s }))
          ]
        },
        {
          type: 'number',
          name: 'limit',
          message: 'Results per page:',
          default: 10
        }
      ]);

      const spinner = display.showLoading('Searching...');
      const result = await productService.searchProducts(answers);
      spinner.stop();

      display.displaySearchResults(result);

      // Ask if user wants to view details
      const { viewDetails } = await inquirer.prompt([{
        type: 'confirm',
        name: 'viewDetails',
        message: 'View product details?',
        default: false
      }]);

      if (viewDetails && result.products.length > 0) {
        await this.selectAndViewProduct(result.products);
      }

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * View product by ID
   */
  async viewProduct() {
    try {
      const { productId } = await inquirer.prompt([{
        type: 'input',
        name: 'productId',
        message: 'Enter Product ID:'
      }]);

      const spinner = display.showLoading('Loading product...');
      const product = await productService.getProductById(productId);
      spinner.stop();

      display.displayProductDetails(product);

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * Update product
   */
  async updateProduct() {
    try {
      display.clearScreen();
      const { productId } = await inquirer.prompt([{
        type: 'input',
        name: 'productId',
        message: 'Enter Product ID to update:'
      }]);

      // Load existing product
      const spinner = display.showLoading('Loading product...');
      const product = await productService.getProductById(productId);
      spinner.stop();

      display.displayProductDetails(product);

      // Ask what to update
      const { fields } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'fields',
        message: 'Select fields to update:',
        choices: [
          'name',
          'description',
          'price',
          'brand',
          'tags',
          'status'
        ]
      }]);

      if (fields.length === 0) {
        display.displayInfo('No fields selected for update');
        return;
      }

      // Collect new values
      const updates = {};
      
      for (const field of fields) {
        let answer;
        
        switch (field) {
          case 'name':
            answer = await inquirer.prompt([{
              type: 'input',
              name: 'value',
              message: 'New name:',
              default: product.name
            }]);
            updates.name = answer.value;
            break;
            
          case 'description':
            answer = await inquirer.prompt([{
              type: 'input',
              name: 'value',
              message: 'New description:',
              default: product.description
            }]);
            updates.description = answer.value;
            break;
            
          case 'price':
            answer = await inquirer.prompt([{
              type: 'number',
              name: 'value',
              message: 'New price:',
              default: product.price
            }]);
            updates.price = answer.value;
            break;
            
          case 'brand':
            answer = await inquirer.prompt([{
              type: 'input',
              name: 'value',
              message: 'New brand:',
              default: product.brand
            }]);
            updates.brand = answer.value;
            break;
            
          case 'tags':
            answer = await inquirer.prompt([{
              type: 'input',
              name: 'value',
              message: 'New tags (comma-separated):',
              default: product.tags.join(', ')
            }]);
            updates.tags = answer.value.split(',').map(t => t.trim()).filter(t => t);
            break;
            
          case 'status':
            answer = await inquirer.prompt([{
              type: 'list',
              name: 'value',
              message: 'New status:',
              choices: Object.values(PRODUCT_STATUS),
              default: product.status
            }]);
            updates.status = answer.value;
            break;
        }
      }

      // Confirm update
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'Confirm update?',
        default: true
      }]);

      if (!confirm) {
        display.displayInfo('Update cancelled');
        return;
      }

      // Update product
      const updateSpinner = display.showLoading('Updating product...');
      const updatedProduct = await productService.updateProduct(productId, updates);
      updateSpinner.succeed('Product updated successfully!');

      display.displayProductDetails(updatedProduct);

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * Delete product
   */
  async deleteProduct() {
    try {
      const { productId } = await inquirer.prompt([{
        type: 'input',
        name: 'productId',
        message: 'Enter Product ID to delete:'
      }]);

      // Load product
      const spinner = display.showLoading('Loading product...');
      const product = await productService.getProductById(productId);
      spinner.stop();

      display.displayProductDetails(product);

      // Confirm deletion
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: chalk.red('Are you sure you want to delete this product?'),
        default: false
      }]);

      if (!confirm) {
        display.displayInfo('Deletion cancelled');
        return;
      }

      // Delete
      const deleteSpinner = display.showLoading('Deleting product...');
      await productService.deleteProduct(productId);
      deleteSpinner.succeed('Product deleted successfully!');

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * Manage inventory
   */
  async manageInventory() {
    try {
      const { productId } = await inquirer.prompt([{
        type: 'input',
        name: 'productId',
        message: 'Enter Product ID:'
      }]);

      const spinner = display.showLoading('Loading product...');
      const product = await productService.getProductById(productId);
      spinner.stop();

      display.displayProductDetails(product);

      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Select action:',
        choices: [
          { name: '➕ Add Stock', value: 'add' },
          { name: '➖ Remove Stock', value: 'remove' },
          { name: '🔙 Back', value: 'back' }
        ]
      }]);

      if (action === 'back') return;

      const { quantity } = await inquirer.prompt([{
        type: 'number',
        name: 'quantity',
        message: `Quantity to ${action}:`,
        validate: input => input > 0 || 'Quantity must be positive'
      }]);

      const inventorySpinner = display.showLoading(`${action === 'add' ? 'Adding' : 'Removing'} stock...`);
      
      const updatedProduct = action === 'add'
        ? await productService.addStock(productId, quantity)
        : await productService.removeStock(productId, quantity);
        
      inventorySpinner.succeed('Inventory updated successfully!');

      display.displayProductDetails(updatedProduct);

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * View low stock products
   */
  async viewLowStock() {
    try {
      const { threshold } = await inquirer.prompt([{
        type: 'number',
        name: 'threshold',
        message: 'Low stock threshold:',
        default: 10
      }]);

      const spinner = display.showLoading('Checking stock levels...');
      const products = await productService.getLowStockProducts(threshold);
      spinner.stop();

      display.displayLowStockAlert(products);

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * View top sellers
   */
  async viewTopSellers() {
    try {
      const { limit } = await inquirer.prompt([{
        type: 'number',
        name: 'limit',
        message: 'Number of top sellers:',
        default: 10
      }]);

      const spinner = display.showLoading('Loading top sellers...');
      const products = await productService.getTopSellers(limit);
      spinner.stop();

      display.displayTopSellers(products);

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * View product statistics
   */
  async viewStatistics() {
    try {
      const spinner = display.showLoading('Calculating statistics...');
      const stats = await productService.getProductStats();
      spinner.stop();

      display.displayStats(stats);

    } catch (error) {
      display.displayError(error.message);
    }
  }

  /**
   * Helper: Select and view product from list
   */
  async selectAndViewProduct(products) {
    const choices = products.map(p => ({
      name: `${p.name} (${p.sku})`,
      value: p._id.toString()
    }));

    const { productId } = await inquirer.prompt([{
      type: 'list',
      name: 'productId',
      message: 'Select product to view:',
      choices
    }]);

    const product = await productService.getProductById(productId);
    display.displayProductDetails(product);
  }
}

const chalk = require('chalk');
module.exports = new ProductCommands();