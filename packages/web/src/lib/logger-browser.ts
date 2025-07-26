// Universal logger implementation for @sourcebot/logger
// This provides a winston-compatible interface that works in both Node.js and browser environments

interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
  log: (level: string, message: string, ...args: unknown[]) => void;
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * Browser-compatible logger implementation
 */
const createBrowserLogger = (label: string): Logger => {
  return {
    info: (message: string, ...args: unknown[]) => {
      console.info(`[${label}] ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(`[${label}] ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(`[${label}] ${message}`, ...args);
    },
    debug: (message: string, ...args: unknown[]) => {
      console.debug(`[${label}] ${message}`, ...args);
    },
    log: (level: string, message: string, ...args: unknown[]) => {
      const levelMethod = level.toLowerCase() as keyof Console;
      if (typeof console[levelMethod] === 'function') {
        (console[levelMethod] as any)(`[${label}] ${message}`, ...args);
      } else {
        console.log(`[${label}] ${level.toUpperCase()}: ${message}`, ...args);
      }
    }
  };
};

/**
 * Node.js logger implementation - tries to use the original winston logger
 */
const createNodeLogger = (label: string): Logger => {
  try {
    // This will only work in Node.js environments where winston is available
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const winston = require('winston');
    const format = winston.format;
    const { combine, colorize, timestamp, errors, printf, label: labelFn } = format;

    const humanReadableFormat = printf(({ level, message, timestamp, stack, label: _label }: any) => {
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
};

/**
 * Universal createLogger function that works in both environments
 */
export const createLogger = (label: string): Logger => {
  if (isBrowser) {
    return createBrowserLogger(label);
  } else {
    return createNodeLogger(label);
  }
};