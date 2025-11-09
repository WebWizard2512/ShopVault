/**
 * Logger Utility
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
    
    this.logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    this.logFile = path.join(this.logsDir, `shopvault-${dayjs().format('YYYY-MM-DD')}.log`);
  }

  shouldLog(level) {
    return this.logLevels[level] <= this.logLevels[this.logLevel];
  }

  getTimestamp() {
    return dayjs().format('YYYY-MM-DD HH:mm:ss');
  }

  writeToFile(level, message) {
    const logEntry = `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}\n`;
    try {
      fs.appendFileSync(this.logFile, logEntry, 'utf8');
    } catch (error) {
      // Fail silently
    }
  }

  error(message, error = null) {
    if (!this.shouldLog('error')) return;
    
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.red.bold('[ERROR]');
    const msg = chalk.red(message);
    
    console.error(`${timestamp} ${level} ${msg}`);
    
    if (error && error.stack && process.env.NODE_ENV === 'development') {
      console.error(chalk.red(error.stack));
    }
    
    this.writeToFile('error', `${message} ${error ? error.stack : ''}`);
  }

  warn(message) {
    if (!this.shouldLog('warn')) return;
    
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.yellow.bold('[WARN]');
    const msg = chalk.yellow(message);
    
    console.warn(`${timestamp} ${level} ${msg}`);
    this.writeToFile('warn', message);
  }

  info(message) {
    if (!this.shouldLog('info')) return;
    
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.blue.bold('[INFO]');
    const msg = chalk.blue(message);
    
    console.log(`${timestamp} ${level} ${msg}`);
    this.writeToFile('info', message);
  }

  success(message) {
    if (!this.shouldLog('success')) return;
    
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.green.bold('[SUCCESS]');
    const msg = chalk.green(message);
    
    console.log(`${timestamp} ${level} ${msg}`);
    this.writeToFile('success', message);
  }

  debug(message) {
    if (!this.shouldLog('debug')) return;
    
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.cyan.bold('[DEBUG]');
    const msg = chalk.cyan(message);
    
    console.log(`${timestamp} ${level} ${msg}`);
    this.writeToFile('debug', message);
  }

  separator(char = '=', length = 70) {
    console.log(chalk.gray(char.repeat(length)));
  }

  header(text) {
    this.separator();
    console.log(chalk.bold.cyan(`  ${text.toUpperCase()}`));
    this.separator();
  }
}

module.exports = new Logger();