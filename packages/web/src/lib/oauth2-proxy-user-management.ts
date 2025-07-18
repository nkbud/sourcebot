import { prisma } from "@/prisma";
import { OAuth2ProxyUser } from "./oauth2-proxy-auth";
import { createLogger } from "@sourcebot/logger";
import { SINGLE_TENANT_ORG_ID } from "./constants";
import { env } from "@/env.mjs";

const logger = createLogger('oauth2-proxy-user-management');

/**
 * Ensure user exists in database and create if necessary
 * This handles Just-In-Time (JIT) user provisioning for OAuth2 Proxy
 */
export async function ensureUserExists(oauth2User: OAuth2ProxyUser): Promise<string> {
    try {
        // Check if user already exists
        let user = await prisma.user.findUnique({
            where: { email: oauth2User.email }
        });

        if (!user) {
            logger.info('Creating new user from OAuth2 Proxy headers', {
                email: oauth2User.email,
                name: oauth2User.name
            });

            // Create new user
            user = await prisma.user.create({
                data: {
                    id: oauth2User.id,
                    email: oauth2User.email,
                    name: oauth2User.name,
                    emailVerified: new Date(), // OAuth2 Proxy users are considered verified
                }
            });

            // In single-tenant mode, automatically add user to the organization
            if (env.SOURCEBOT_TENANCY_MODE === "single") {
                await prisma.userToOrg.create({
                    data: {
                        userId: user.id,
                        orgId: SINGLE_TENANT_ORG_ID,
                        role: 'MEMBER'
                    }
                });
                logger.info('Added user to single-tenant organization', {
                    userId: user.id,
                    orgId: SINGLE_TENANT_ORG_ID
                });
            }
        } else if (user.id !== oauth2User.id) {
            // Update user ID if it has changed (rare case)
            logger.info('Updating user ID from OAuth2 Proxy', {
                email: oauth2User.email,
                oldId: user.id,
                newId: oauth2User.id
            });
            
            user = await prisma.user.update({
                where: { id: user.id },
                data: { id: oauth2User.id }
            });
        }

        return user.id;
    } catch (error) {
        logger.error('Failed to ensure user exists', {
            error: error instanceof Error ? error.message : 'Unknown error',
            email: oauth2User.email
        });
        throw error;
    }
}

/**
 * Update user information from OAuth2 Proxy headers
 */
export async function updateUserFromOAuth2Proxy(oauth2User: OAuth2ProxyUser): Promise<void> {
    try {
        await prisma.user.update({
            where: { id: oauth2User.id },
            data: {
                name: oauth2User.name,
                email: oauth2User.email,
                // Update last login time
                updatedAt: new Date()
            }
        });
    } catch (error) {
        logger.error('Failed to update user from OAuth2 Proxy', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: oauth2User.id
        });
        throw error;
    }
}

/**
 * Get user by ID (used by the new auth system)
 */
export async function getUserById(userId: string) {
    return await prisma.user.findUnique({
        where: { id: userId }
    });
}

/**
 * Check if user has access to organization
 */
export async function hasOrgAccess(userId: string, orgId: string): Promise<boolean> {
    const membership = await prisma.userToOrg.findUnique({
        where: {
            orgId_userId: {
                orgId,
                userId
            }
        }
    });
    return !!membership;
}