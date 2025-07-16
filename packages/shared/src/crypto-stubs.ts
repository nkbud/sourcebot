// Stub implementations for removed crypto functions
import { createLogger } from "@sourcebot/logger";

const logger = createLogger('crypto-stubs');

export const decrypt = (iv: string, encryptedValue: string): string => {
  logger.warn('decrypt function called but crypto package removed - returning empty string');
  return '';
};

export const encrypt = (value: string): { iv: string; encryptedData: string } => {
  logger.warn('encrypt function called but crypto package removed - returning mock values');
  return { iv: '', encryptedData: '' };
};

export const generateApiKey = (): { key: string; hash: string } => {
  logger.warn('generateApiKey function called but crypto package removed - returning mock key');
  return { key: 'mock-api-key', hash: 'mock-hash' };
};

export const hashSecret = (secret: string): string => {
  logger.warn('hashSecret function called but crypto package removed - returning mock hash');
  return 'mock-hash';
};

export const getTokenFromConfig = async (token: any, orgId: number, db: any): Promise<string> => {
  logger.warn('getTokenFromConfig function called but crypto package removed - returning empty string');
  return '';
};

export const verifySignature = (payload: any, signature: string, key: string): boolean => {
  logger.warn('verifySignature function called but crypto package removed - returning false');
  return false;
};