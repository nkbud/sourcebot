import type { Provider } from "next-auth/providers";
import { env } from "@/env.mjs";
import { prisma } from "@/prisma";
import Credentials from "next-auth/providers/credentials";
import type { User as AuthJsUser } from "next-auth";
import { onCreateUser } from "@/lib/authUtils";
import { createLogger } from "@sourcebot/logger";

const logger = createLogger('web-oauth2-proxy');

/**
 * OAuth2 Proxy authentication provider
 * 
 * This provider enables header-based authentication when using OAuth2 Proxy
 * as a sidecar service. It validates and trusts authentication headers
 * forwarded by OAuth2 Proxy after successful authentication.
 * 
 * Security considerations:
 * - Only enabled when SOURCEBOT_TRUST_PROXY_HEADERS is explicitly set to 'true'
 * - Headers must be properly validated and sanitized
 * - Should only be used in environments where OAuth2 Proxy is the only ingress
 * - Network policies should prevent direct access to the application
 */
export const getOAuth2ProxyProvider = (): Provider | null => {
    // Only enable OAuth2 Proxy authentication if explicitly configured
    if (env.SOURCEBOT_TRUST_PROXY_HEADERS !== 'true') {
        return null;
    }

    return Credentials({
        id: "oauth2-proxy",
        name: "OAuth2 Proxy",
        credentials: {},
        authorize: async (credentials, req) => {
            try {
                // Extract headers set by OAuth2 Proxy
                const userHeader = req.headers?.get(env.SOURCEBOT_PROXY_USER_HEADER);
                const emailHeader = req.headers?.get(env.SOURCEBOT_PROXY_EMAIL_HEADER);
                const nameHeader = req.headers?.get(env.SOURCEBOT_PROXY_NAME_HEADER || 'X-Forwarded-Preferred-Username');
                const groupsHeader = req.headers?.get(env.SOURCEBOT_PROXY_GROUPS_HEADER || 'X-Forwarded-Groups');

                // Validate required headers
                if (!emailHeader || typeof emailHeader !== "string") {
                    logger.warn("OAuth2 Proxy authentication failed: Missing or invalid email header");
                    return null;
                }

                // Sanitize and validate email format
                const email = emailHeader.toLowerCase().trim();
                if (!email || !email.includes('@')) {
                    logger.warn("OAuth2 Proxy authentication failed: Invalid email format");
                    return null;
                }

                // Extract user information from headers
                const name = nameHeader || userHeader || email;
                const groups = groupsHeader ? groupsHeader.split(',').map(g => g.trim()).filter(Boolean) : [];

                logger.info(`OAuth2 Proxy authentication for user: ${email}${groups.length > 0 ? `, groups: ${groups.join(', ')}` : ''}`);

                // Check if user already exists
                const existingUser = await prisma.user.findUnique({
                    where: { email }
                });

                if (!existingUser) {
                    // Create new user
                    const newUser = await prisma.user.create({
                        data: {
                            email,
                            name,
                            image: null,
                        }
                    });

                    const authJsUser: AuthJsUser = {
                        id: newUser.id,
                        email: newUser.email,
                        name: newUser.name,
                        image: newUser.image,
                    };

                    await onCreateUser({ user: authJsUser });
                    return authJsUser;
                } else {
                    // Update existing user if name has changed
                    if (existingUser.name !== name) {
                        await prisma.user.update({
                            where: { id: existingUser.id },
                            data: { name }
                        });
                    }

                    return {
                        id: existingUser.id,
                        email: existingUser.email,
                        name: name || existingUser.name,
                        image: existingUser.image,
                    };
                }
            } catch (error) {
                logger.error("Error processing OAuth2 Proxy authentication:", error);
                return null;
            }
        },
    });
};

/**
 * Validates that OAuth2 Proxy configuration is secure
 * This function should be called during application startup
 */
export const validateOAuth2ProxyConfig = (): void => {
    if (env.SOURCEBOT_TRUST_PROXY_HEADERS === 'true') {
        logger.info("OAuth2 Proxy authentication is enabled");
        
        // Validate required configuration
        if (!env.SOURCEBOT_PROXY_EMAIL_HEADER) {
            throw new Error("SOURCEBOT_PROXY_EMAIL_HEADER must be configured when OAuth2 Proxy authentication is enabled");
        }
        
        if (!env.SOURCEBOT_PROXY_USER_HEADER) {
            throw new Error("SOURCEBOT_PROXY_USER_HEADER must be configured when OAuth2 Proxy authentication is enabled");
        }

        // Security warnings
        logger.warn("⚠️  OAuth2 Proxy mode is enabled - ensure the following security measures are in place:");
        logger.warn("   1. OAuth2 Proxy is the ONLY ingress to this application");
        logger.warn("   2. Direct access to this application is blocked at the network level");
        logger.warn("   3. OAuth2 Proxy is properly configured with OIDC/OAuth2");
        logger.warn("   4. TLS is enforced between OAuth2 Proxy and this application");
    }
};

/**
 * Security middleware to validate OAuth2 Proxy headers
 * This should be used to ensure requests are coming through OAuth2 Proxy
 */
export const validateOAuth2ProxyHeaders = (headers: Headers): boolean => {
    if (env.SOURCEBOT_TRUST_PROXY_HEADERS !== 'true') {
        return true; // Not using OAuth2 Proxy mode
    }

    // Check for required OAuth2 Proxy headers
    const hasEmailHeader = headers.has(env.SOURCEBOT_PROXY_EMAIL_HEADER);
    const hasUserHeader = headers.has(env.SOURCEBOT_PROXY_USER_HEADER);

    if (!hasEmailHeader || !hasUserHeader) {
        logger.warn("Request missing required OAuth2 Proxy headers - possible direct access attempt");
        return false;
    }

    return true;
};