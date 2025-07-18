import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser, OAuth2ProxyUser } from './oauth2-proxy-auth';
import { ensureUserExists } from './oauth2-proxy-user-management';
import { createLogger } from '@sourcebot/logger';

const logger = createLogger('auth-new');

/**
 * Get the current authenticated user from OAuth2 Proxy headers
 * This replaces the NextAuth.js auth() function
 */
export async function auth(): Promise<{ user: OAuth2ProxyUser } | null> {
  const headersList = await headers();
  const user = getCurrentUser(headersList);
  
  if (!user) {
    logger.debug('No authenticated user found in OAuth2 Proxy headers');
    return null;
  }
  
  try {
    // Ensure user exists in database (JIT provisioning)
    await ensureUserExists(user);
    
    logger.debug('Authenticated user found', { userId: user.id, email: user.email });
    return { user };
  } catch (error) {
    logger.error('Failed to ensure user exists during authentication', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: user.id,
      email: user.email
    });
    return null;
  }
}

/**
 * Require authentication - redirect to login if not authenticated
 * This replaces NextAuth.js redirect behavior
 */
export async function requireAuth(): Promise<{ user: OAuth2ProxyUser }> {
  const session = await auth();
  
  if (!session) {
    logger.info('Authentication required, redirecting to login');
    // OAuth2 Proxy will handle the redirect to Okta
    redirect('/login');
  }
  
  return session;
}

/**
 * Check if user is authenticated without redirecting
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session;
}

/**
 * Get user ID from authentication
 */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
}

/**
 * Check if user has required group membership
 */
export async function hasGroup(requiredGroup: string): Promise<boolean> {
  const session = await auth();
  return session?.user.groups?.includes(requiredGroup) ?? false;
}

/**
 * Require specific group membership
 */
export async function requireGroup(requiredGroup: string): Promise<{ user: OAuth2ProxyUser }> {
  const session = await requireAuth();
  
  if (!session.user.groups?.includes(requiredGroup)) {
    logger.warn('User does not have required group', { 
      userId: session.user.id, 
      requiredGroup,
      userGroups: session.user.groups 
    });
    redirect('/unauthorized');
  }
  
  return session;
}