// DEPRECATED: This file is deprecated and will be removed.
// Use /lib/auth-new.ts for OAuth2 Proxy authentication instead.

import 'next-auth/jwt';
import NextAuth, { DefaultSession, User as AuthJsUser } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import EmailProvider from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/prisma";
import { env } from "@/env.mjs";
import { User } from '@/lib/db-stubs';
import 'next-auth/jwt';
import type { Provider } from "next-auth/providers";
import { verifyCredentialsRequestSchema } from './lib/schemas';
import { createTransport } from 'nodemailer';
import { render } from '@react-email/render';
import MagicLinkEmail from './emails/magicLinkEmail';
import bcrypt from 'bcryptjs';
import { getSSOProviders } from '@/lib/sso';
import { hasEntitlement } from '@sourcebot/shared';
import { onCreateUser } from '@/lib/authUtils';
import { getAuditService } from '@/lib/audit';
import { SINGLE_TENANT_ORG_ID } from './lib/constants';
import { OAuth2Config } from "next-auth/providers";

const auditService = getAuditService();

export const runtime = 'nodejs';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
        } & DefaultSession['user'];
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        userId: string
    }
}

/**
 * Create a Dex OAuth2 provider for authentication.
 * 
 * DEPRECATED: Use OAuth2 Proxy with Okta SSO instead.
 * 
 * @see https://dexidp.io/docs/guides/using-dex/
 */
export const createDexProvider = (): OAuth2Config<any> | null => {
    // Legacy DEX support disabled - use OAuth2 Proxy instead
    return null;
};

export const getProviders = () => {
    const providers: Provider[] = [];

    // All legacy providers are disabled - use OAuth2 Proxy instead
    return providers;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    secret: env.AUTH_SECRET,
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    trustHost: true,
    events: {
        createUser: onCreateUser,
        signIn: async ({ user }) => {
            if (user.id) {
                await auditService.createAudit({
                    action: "user.signed_in",
                    actor: {
                        id: user.id,
                        type: "user"
                    },
                    orgId: SINGLE_TENANT_ORG_ID, // TODO(mt)
                    target: {
                        id: user.id,
                        type: "user"
                    }
                });
            }
        },
        signOut: async (message) => {
            const token = message as { token: { userId: string } | null };
            if (token?.token?.userId) {
                await auditService.createAudit({
                    action: "user.signed_out",
                    actor: {
                        id: token.token.userId,
                        type: "user"
                    },
                    orgId: SINGLE_TENANT_ORG_ID, // TODO(mt)
                    target: {
                        id: token.token.userId,
                        type: "user"
                    }
                });
            }
        }
    },
    callbacks: {
        async jwt({ token, user: _user }) {
            const user = _user as User | undefined;
            // @note: `user` will be available on signUp or signIn triggers.
            // Cache the userId in the JWT for later use.
            if (user) {
                token.userId = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            // @WARNING: Anything stored in the session will be sent over
            // to the client.
            session.user = {
                ...session.user,
                // Propogate the userId to the session.
                id: token.userId,
            }
            return session;
        },
    },
    providers: getProviders(),
    pages: {
        signIn: "/login",
        // We set redirect to false in signInOptions so we can pass the email is as a param
        // verifyRequest: "/login/verify",
    }
});
