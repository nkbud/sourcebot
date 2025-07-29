import type { Provider } from "next-auth/providers";
import { env } from "@/env.mjs";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Okta from "next-auth/providers/okta";
import Keycloak from "next-auth/providers/keycloak";
import Gitlab from "next-auth/providers/gitlab";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { prisma } from "@/prisma";
import { OAuth2Client } from "google-auth-library";
import Credentials from "next-auth/providers/credentials";
import type { User as AuthJsUser } from "next-auth";
import { onCreateUser } from "@/lib/authUtils";
import { createLogger } from "@sourcebot/logger";

const logger = createLogger('web-sso');

export const getSSOProviders = (): Provider[] => {
    const providers: Provider[] = [];

    if (env.AUTH_EE_GITHUB_CLIENT_ID && env.AUTH_EE_GITHUB_CLIENT_SECRET) {
        const baseUrl = env.AUTH_EE_GITHUB_BASE_URL ?? "https://github.com";
        const apiUrl = env.AUTH_EE_GITHUB_BASE_URL ? `${env.AUTH_EE_GITHUB_BASE_URL}/api/v3` : "https://api.github.com";
        providers.push(GitHub({
            clientId: env.AUTH_EE_GITHUB_CLIENT_ID,
            clientSecret: env.AUTH_EE_GITHUB_CLIENT_SECRET,
            authorization: {
                url: `${baseUrl}/login/oauth/authorize`,
                params: {
                    scope: "read:user user:email",
                },
            },
            token: {
                url: `${baseUrl}/login/oauth/access_token`,
            },
            userinfo: {
                url: `${apiUrl}/user`,
            },
        }));
    }

    if (env.AUTH_EE_GITLAB_CLIENT_ID && env.AUTH_EE_GITLAB_CLIENT_SECRET) {
        providers.push(Gitlab({
            clientId: env.AUTH_EE_GITLAB_CLIENT_ID,
            clientSecret: env.AUTH_EE_GITLAB_CLIENT_SECRET,
            authorization: {
                url: `${env.AUTH_EE_GITLAB_BASE_URL}/oauth/authorize`,
                params: {
                    scope: "read_user",
                },
            },
            token: {
                url: `${env.AUTH_EE_GITLAB_BASE_URL}/oauth/token`,
            },
            userinfo: {
                url: `${env.AUTH_EE_GITLAB_BASE_URL}/api/v4/user`,
            },
        }));
    }

    if (env.AUTH_EE_GOOGLE_CLIENT_ID && env.AUTH_EE_GOOGLE_CLIENT_SECRET) {
        providers.push(Google({
            clientId: env.AUTH_EE_GOOGLE_CLIENT_ID,
            clientSecret: env.AUTH_EE_GOOGLE_CLIENT_SECRET,
        }));
    }

    if (env.AUTH_EE_OKTA_CLIENT_ID && env.AUTH_EE_OKTA_CLIENT_SECRET && env.AUTH_EE_OKTA_ISSUER) {
        providers.push(Okta({
            clientId: env.AUTH_EE_OKTA_CLIENT_ID,
            clientSecret: env.AUTH_EE_OKTA_CLIENT_SECRET,
            issuer: env.AUTH_EE_OKTA_ISSUER,
        }));
    }

    if (env.AUTH_EE_KEYCLOAK_CLIENT_ID && env.AUTH_EE_KEYCLOAK_CLIENT_SECRET && env.AUTH_EE_KEYCLOAK_ISSUER) {
        providers.push(Keycloak({
            clientId: env.AUTH_EE_KEYCLOAK_CLIENT_ID,
            clientSecret: env.AUTH_EE_KEYCLOAK_CLIENT_SECRET,
            issuer: env.AUTH_EE_KEYCLOAK_ISSUER,
        }));
    }

    if (env.AUTH_EE_MICROSOFT_ENTRA_ID_CLIENT_ID && env.AUTH_EE_MICROSOFT_ENTRA_ID_CLIENT_SECRET && env.AUTH_EE_MICROSOFT_ENTRA_ID_ISSUER) {
        providers.push(MicrosoftEntraID({
            clientId: env.AUTH_EE_MICROSOFT_ENTRA_ID_CLIENT_ID,
            clientSecret: env.AUTH_EE_MICROSOFT_ENTRA_ID_CLIENT_SECRET,
            issuer: env.AUTH_EE_MICROSOFT_ENTRA_ID_ISSUER,
        }));
    }

    if (env.AUTH_EE_GCP_IAP_ENABLED && env.AUTH_EE_GCP_IAP_AUDIENCE) {
        providers.push(Credentials({
            id: "gcp-iap",
            name: "Google Cloud IAP",
            credentials: {},
            authorize: async (credentials, req) => {
                try {
                    const iapAssertion = req.headers?.get("x-goog-iap-jwt-assertion");
                    if (!iapAssertion || typeof iapAssertion !== "string") {
                        logger.warn("No IAP assertion found in headers");
                        return null;
                    }

                    const oauth2Client = new OAuth2Client();
                    
                    const { pubkeys } = await oauth2Client.getIapPublicKeys();
                    const ticket = await oauth2Client.verifySignedJwtWithCertsAsync(
                        iapAssertion,
                        pubkeys,
                        env.AUTH_EE_GCP_IAP_AUDIENCE,
                        ['https://cloud.google.com/iap']
                    );

                    const payload = ticket.getPayload();
                    if (!payload) {
                        logger.warn("Invalid IAP token payload");
                        return null;
                    }

                    const email = payload.email;
                    const name = payload.name || payload.email;
                    const image = payload.picture;

                    if (!email) {
                        logger.warn("Missing email in IAP token");
                        return null;
                    }

                    const existingUser = await prisma.user.findUnique({
                        where: { email }
                    });

                    if (!existingUser) {
                        const newUser = await prisma.user.create({
                            data: {
                                email,
                                name,
                                image,
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
                        return {
                            id: existingUser.id,
                            email: existingUser.email,
                            name: existingUser.name,
                            image: existingUser.image,
                        };
                    }
                } catch (error) {
                    logger.error("Error verifying IAP token:", error);
                    return null;
                }
            },
        }));
    }

    // OAuth2 Proxy header-based authentication
    if (env.SOURCEBOT_TRUST_PROXY_HEADERS === 'true') {
        providers.push(Credentials({
            id: "oauth2-proxy",
            name: "OAuth2 Proxy",
            credentials: {},
            authorize: async (credentials, req) => {
                try {
                    const userHeader = req.headers?.get(env.SOURCEBOT_PROXY_USER_HEADER);
                    const emailHeader = req.headers?.get(env.SOURCEBOT_PROXY_EMAIL_HEADER);
                    const nameHeader = req.headers?.get(env.SOURCEBOT_PROXY_NAME_HEADER || 'X-Forwarded-Preferred-Username');
                    const groupsHeader = req.headers?.get(env.SOURCEBOT_PROXY_GROUPS_HEADER || 'X-Forwarded-Groups');

                    if (!emailHeader || typeof emailHeader !== "string") {
                        logger.warn("No email header found or invalid email header in OAuth2 Proxy request");
                        return null;
                    }

                    const email = emailHeader;
                    const name = nameHeader || userHeader || email;
                    const groups = groupsHeader ? groupsHeader.split(',').map(g => g.trim()) : [];

                    if (!email) {
                        logger.warn("Missing email in OAuth2 Proxy headers");
                        return null;
                    }

                    logger.info(`OAuth2 Proxy authentication for user: ${email}, groups: ${groups.join(', ')}`);

                    const existingUser = await prisma.user.findUnique({
                        where: { email }
                    });

                    if (!existingUser) {
                        const newUser = await prisma.user.create({
                            data: {
                                email,
                                name,
                                // Store groups in user metadata if needed
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
                        // Update user info from headers if needed
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
                    logger.error("Error processing OAuth2 Proxy headers:", error);
                    return null;
                }
            },
        }));
    }

    return providers;
}