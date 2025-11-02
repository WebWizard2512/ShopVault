/**
 * Logger Utility with Colors
 * 
 * LEARNING NOTES:
 * - Why custom logger? Better control over formatting and log levels
 * - Chalk: Terminal color library for better visual feedback
 * - Log Levels: error > warn > info > debug (can filter by LOG_LEVEL env var)
 * - Production: You'd use Winston or Pino, but this is perfect for CLI apps
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      success: 2,
      debug: 3
    };
    
    // Ensure logs directory exists
    this.logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    this.logFile = path.join(this.logsDir, `shopvault-${dayjs().format('YYYY-MM-DD')}.log`);
  }

  /**
   * Check if log level should be printed
   */
  shouldLog(level) {
    return this.logLevels[level] <= this.logLevels[this.logLevel];
  }

  /**
   * Format timestamp
   */
  getTimestamp() {
    return dayjs().format('YYYY-MM-DD HH:mm:ss');
  }

  /**
   * Write to log file (for production debugging)
   */
  writeToFile(level, message) {
    const logEntry = `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}\n`;
    try {
      fs.appendFileSync(this.logFile, logEntry, 'utf8');
    } catch (error) {
      // Fail silently to not break the app
    }
  }

  /**
   * Error logging (red)
   */
  error(message, error = null) {
    if (!this.shouldLog('error')) return;
    
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.red.bold('[ERROR]');
    const msg = chalk.red(message);
    
    console.error(`${timestamp} ${level} ${msg}`);
    
    if (error && error.stack) {
      console.error(chalk.red(error.stack));
    }
    
    this.writeToFile('error', `${message} ${error ? error.stack : ''}`);
  }

  /**
   * Warning logging (yellow)
   */
  warn(message) {
    if (!this.shouldLog('warn')) return;
    
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.yellow.bold('[WARN]');
    const msg = chalk.yellow(message);
    
    console.warn(`${timestamp} ${level} ${msg}`);
    this.writeToFile('warn', message);
  }

  /**
   * Info logging (blue)
   */
  info(message) {
    if (!this.shouldLog('info')) return;
    
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.blue.bold('[INFO]');
    const msg = chalk.blue(message);
    
    console.log(`${timestamp} ${level} ${msg}`);
    this.writeToFile('info', message);
  }

  /**
   * Success logging (green)
   */
  success(message) {
    if (!this.shouldLog('success')) return;
    
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.green.bold('[SUCCESS]');
    const msg = chalk.green(message);
    
    console.log(`${timestamp} ${level} ${msg}`);
    this.writeToFile('success', message);
  }

  /**
   * Debug logging (cyan)
   */
  debug(message) {
    if (!this.shouldLog('debug')) return;
    
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.cyan.bold('[DEBUG]');
    const msg = chalk.cyan(message);
    
    console.log(`${timestamp} ${level} ${msg}`);
    this.writeToFile('debug', message);
  }

  /**
   * Print separator line
   */
  separator(char = '=', length = 60) {
    console.log(chalk.gray(char.repeat(length)));
  }

  /**
   * Print header
   */
  header(text) {
    this.separator();
    console.log(chalk.bold.cyan(text.toUpperCase()));
    this.separator();
  }

  /**
   * Print box message
   */
  box(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warn: chalk.yellow,
      error: chalk.red
    };
    
    const color = colors[type] || chalk.blue;
    const lines = message.split('\n');
    const maxLength = Math.max(...lines.map(l => l.length));
    const border = '─'.repeat(maxLength + 4);
    
    console.log(color(`┌${border}┐`));
    lines.forEach(line => {
      const padding = ' '.repeat(maxLength - line.length);
      console.log(color(`│  ${line}${padding}  │`));
    });
    console.log(color(`└${border}┘`));
  }
}

// Export singleton instance
module.exports = new Logger();