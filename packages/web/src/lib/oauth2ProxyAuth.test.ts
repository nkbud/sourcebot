/**
 * OAuth2 Proxy Authentication Tests
 * 
 * These tests validate the security and functionality of OAuth2 Proxy
 * header-based authentication, ensuring proper validation and preventing
 * authentication bypass attempts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules first before any imports
vi.mock('@/env.mjs', () => ({
    env: {
        SOURCEBOT_TRUST_PROXY_HEADERS: 'true',
        SOURCEBOT_PROXY_USER_HEADER: 'X-Forwarded-User',
        SOURCEBOT_PROXY_EMAIL_HEADER: 'X-Forwarded-Email',
        SOURCEBOT_PROXY_NAME_HEADER: 'X-Forwarded-Preferred-Username',
        SOURCEBOT_PROXY_GROUPS_HEADER: 'X-Forwarded-Groups',
    }
}));

vi.mock('@/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
    }
}));

vi.mock('@/lib/authUtils', () => ({
    onCreateUser: vi.fn(),
}));

vi.mock('@sourcebot/logger', () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
}));

// Import after mocks
import { getOAuth2ProxyProvider, validateOAuth2ProxyConfig, validateOAuth2ProxyHeaders } from './oauth2ProxyAuth';

describe('OAuth2 Proxy Authentication', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getOAuth2ProxyProvider', () => {
        it('should return OAuth2 Proxy provider when enabled', () => {
            const provider = getOAuth2ProxyProvider();
            expect(provider).not.toBeNull();
            expect(provider?.options?.id).toBe('oauth2-proxy');
            expect(provider?.options?.name).toBe('OAuth2 Proxy');
        });

        it('should authenticate valid user with basic headers', async () => {
            const provider = getOAuth2ProxyProvider();
            if (!provider?.options?.authorize) {
                throw new Error('Provider authorize function not found');
            }

            const mockHeaders = new Map([
                ['X-Forwarded-User', 'testuser'],
                ['X-Forwarded-Email', 'test@company.com'],
            ]);

            const mockRequest = {
                headers: {
                    get: (key: string) => mockHeaders.get(key),
                }
            };

            const existingUser = {
                id: 'user-123',
                email: 'test@company.com',
                name: 'testuser',
                image: null,
            };

            // Get prisma mock and set return value
            const { prisma } = await import('@/prisma');
            vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser);

            // @ts-ignore - Testing private authorize function
            const result = await provider.options.authorize({}, mockRequest);

            expect(result).toEqual(existingUser);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@company.com' }
            });
        });

        it('should reject authentication with missing email header', async () => {
            const provider = getOAuth2ProxyProvider();
            if (!provider?.options?.authorize) {
                throw new Error('Provider authorize function not found');
            }

            const mockHeaders = new Map([
                ['X-Forwarded-User', 'testuser'],
                // Missing email header
            ]);

            const mockRequest = {
                headers: {
                    get: (key: string) => mockHeaders.get(key),
                }
            };

            // @ts-ignore - Testing private authorize function
            const result = await provider.options.authorize({}, mockRequest);

            expect(result).toBeNull();
        });
    });

    describe('validateOAuth2ProxyHeaders', () => {
        it('should return true when all required headers are present', () => {
            const headers = new Headers();
            headers.set('X-Forwarded-Email', 'test@company.com');
            headers.set('X-Forwarded-User', 'testuser');

            const result = validateOAuth2ProxyHeaders(headers);
            expect(result).toBe(true);
        });

        it('should return false when required headers are missing', () => {
            const headers = new Headers();
            headers.set('X-Forwarded-Email', 'test@company.com');
            // Missing X-Forwarded-User header

            const result = validateOAuth2ProxyHeaders(headers);
            expect(result).toBe(false);
        });
    });

    describe('validateOAuth2ProxyConfig', () => {
        it('should not throw when OAuth2 Proxy is properly configured', () => {
            expect(() => validateOAuth2ProxyConfig()).not.toThrow();
        });
    });
});