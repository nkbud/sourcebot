// Universal logger implementation for @sourcebot/logger
// This provides a winston-compatible interface that works in both Node.js and browser environments

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * Browser-compatible logger implementation
 */
function createBrowserLogger(label) {
  return {
    info: function(message, ...args) {
      console.info(`[${label}] ${message}`, ...args);
    },
    warn: function(message, ...args) {
      console.warn(`[${label}] ${message}`, ...args);
    },
    error: function(message, ...args) {
      console.error(`[${label}] ${message}`, ...args);
    },
    debug: function(message, ...args) {
      console.debug(`[${label}] ${message}`, ...args);
    },
    log: function(level, message, ...args) {
      const levelMethod = level.toLowerCase();
      if (typeof console[levelMethod] === 'function') {
        console[levelMethod](`[${label}] ${message}`, ...args);
      } else {
        console.log(`[${label}] ${level.toUpperCase()}: ${message}`, ...args);
      }
    }
  };
}

/**
 * Node.js logger implementation - tries to use the original winston logger
 */
function createNodeLogger(label) {
  try {
    // This will only work in Node.js environments where winston is available
    const winston = require('winston');
    const format = winston.format;
    const { combine, colorize, timestamp, errors, printf, label: labelFn } = format;

    const humanReadableFormat = printf(function({ level, message, timestamp, stack, label: _label }) {
      const labelStr = `[${_label}] `;
      if (stack) {
        return `${timestamp} ${level}: ${labelStr}${message}\n${stack}`;
      }
      return `${timestamp} ${level}: ${labelStr}${message}`;
    });

    const logger = winston.createLogger({
      level: process.env.SOURCEBOT_LOG_LEVEL || 'info',
      format: combine(
        errors({ stack: true }),
        timestamp(),
        labelFn({ label: label })
      ),
      transports: [
        new winston.transports.Console({
          format: combine(
            colorize(),
            humanReadableFormat
          ),
        }),
      ]
    });

    return logger;
  } catch (error) {
    // Fallback to browser logger if winston is not available
    console.warn(`Winston not available for label "${label}", falling back to console`);
    return createBrowserLogger(label);
  }
}

/**
 * Universal createLogger function that works in both environments
 */
function createLogger(label) {
  if (isBrowser) {
    return createBrowserLogger(label);
  } else {
    return createNodeLogger(label);
  }
}

// Export using both CommonJS and ES modules syntax for maximum compatibility
module.exports = { createLogger };
exports.createLogger = createLogger;