import { NextRequest } from 'next/server';
import { env } from '@/env.mjs';
import { createLogger } from '@sourcebot/logger';

const logger = createLogger('oauth2-proxy-auth');

export interface OAuth2ProxyUser {
  id: string;
  email: string;
  name?: string;
  groups?: string[];
}

/**
 * Headers set by OAuth2 Proxy that contain user information
 */
export const OAUTH2_PROXY_HEADERS = {
  USER: 'x-forwarded-user',
  EMAIL: 'x-forwarded-email', 
  GROUPS: 'x-forwarded-groups',
  PREFERRED_USERNAME: 'x-forwarded-preferred-username',
} as const;

/**
 * Validates that the request is coming from OAuth2 Proxy by checking
 * for the presence of required headers and basic validation
 */
export function validateOAuth2ProxyHeaders(headers: Headers): boolean {
  const user = headers.get(OAUTH2_PROXY_HEADERS.USER);
  const email = headers.get(OAUTH2_PROXY_HEADERS.EMAIL);
  
  // Both user and email must be present
  if (!user || !email) {
    logger.debug('Missing required OAuth2 Proxy headers', {
      hasUser: !!user,
      hasEmail: !!email,
    });
    return false;
  }
  
  // Basic email validation
  if (!email.includes('@')) {
    logger.warn('Invalid email format in OAuth2 Proxy headers', { email });
    return false;
  }
  
  return true;
}

/**
 * Extracts user information from OAuth2 Proxy headers
 */
export function extractUserFromHeaders(headers: Headers): OAuth2ProxyUser | null {
  if (!validateOAuth2ProxyHeaders(headers)) {
    return null;
  }
  
  const user = headers.get(OAUTH2_PROXY_HEADERS.USER)!;
  const email = headers.get(OAUTH2_PROXY_HEADERS.EMAIL)!;
  const groups = headers.get(OAUTH2_PROXY_HEADERS.GROUPS);
  const preferredUsername = headers.get(OAUTH2_PROXY_HEADERS.PREFERRED_USERNAME);
  
  return {
    id: user, // OAuth2 Proxy typically uses the user ID as the user header
    email,
    name: preferredUsername || user,
    groups: groups ? groups.split(',').map(g => g.trim()) : undefined,
  };
}

/**
 * Middleware-compatible function to extract user from request headers
 */
export function getUserFromRequest(request: NextRequest): OAuth2ProxyUser | null {
  return extractUserFromHeaders(request.headers);
}

/**
 * Get the current authenticated user from headers (for server components)
 */
export function getCurrentUser(headers: Headers): OAuth2ProxyUser | null {
  return extractUserFromHeaders(headers);
}

/**
 * Check if user has required group membership (for authorization)
 */
export function hasRequiredGroup(user: OAuth2ProxyUser, requiredGroups: string[]): boolean {
  if (!user.groups || user.groups.length === 0) {
    return false;
  }
  
  return requiredGroups.some(group => user.groups!.includes(group));
}