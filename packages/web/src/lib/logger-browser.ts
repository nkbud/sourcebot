// Browser-compatible logger implementation to replace @sourcebot/logger
// This module provides the same API but uses console instead of winston

/**
 * Browser-compatible logger that mimics the winston interface
 * Used in frontend builds to replace Node.js winston dependency
 */
const createLogger = (label: string) => {
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

export { createLogger };