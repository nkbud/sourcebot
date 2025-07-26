// Type declarations for the universal logger
declare module './logger-browser' {
  interface Logger {
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
    debug: (message: string, ...args: unknown[]) => void;
    log: (level: string, message: string, ...args: unknown[]) => void;
  }

  export function createLogger(label: string): Logger;
}