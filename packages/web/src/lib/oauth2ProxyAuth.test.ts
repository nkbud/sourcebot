/**
 * OAuth2 Proxy Authentication Tests
 * 
 * These tests validate the security and functionality of OAuth2 Proxy
 * header-based authentication, ensuring proper validation and preventing
 * authentication bypass attempts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getOAuth2ProxyProvider, validateOAuth2ProxyConfig, validateOAuth2ProxyHeaders } from './oauth2ProxyAuth';

// Mock modules
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

describe('OAuth2 Proxy Authentication', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('getOAuth2ProxyProvider', () => {
        it('should return null when OAuth2 Proxy is not enabled', () => {
            vi.doMock('@/env.mjs', () => ({
                env: {
                    SOURCEBOT_TRUST_PROXY_HEADERS: 'false',
                }
            }));

            const provider = getOAuth2ProxyProvider();
            expect(provider).toBeNull();
        });

        it('should return OAuth2 Proxy provider when enabled', () => {
            const provider = getOAuth2ProxyProvider();
            expect(provider).not.toBeNull();
            expect(provider?.id).toBe('oauth2-proxy');
            expect(provider?.name).toBe('OAuth2 Proxy');
        });

        it('should authenticate valid user with all headers', async () => {
            const provider = getOAuth2ProxyProvider();
            const mockHeaders = new Map([
                ['X-Forwarded-User', 'testuser'],
                ['X-Forwarded-Email', 'test@company.com'],
                ['X-Forwarded-Preferred-Username', 'Test User'],
                ['X-Forwarded-Groups', 'developers,admin'],
            ]);

            const mockRequest = {
                headers: {
                    get: (key: string) => mockHeaders.get(key),
                }
            };

            const existingUser = {
                id: 'user-123',
                email: 'test@company.com',
                name: 'Test User',
                image: null,
            };

            // Get the mocked prisma instance
            const { prisma } = await import('@/prisma');
            vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser);

            // @ts-ignore - Testing the authorize function
            const result = await provider.authorize({}, mockRequest);

            expect(result).toEqual({
                id: 'user-123',
                email: 'test@company.com',
                name: 'Test User',
                image: null,
            });

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@company.com' }
            });
        });

        it('should create new user when user does not exist', async () => {
            const provider = getOAuth2ProxyProvider();
            const mockHeaders = new Map([
                ['X-Forwarded-User', 'newuser'],
                ['X-Forwarded-Email', 'new@company.com'],
                ['X-Forwarded-Preferred-Username', 'New User'],
            ]);

            const mockRequest = {
                headers: {
                    get: (key: string) => mockHeaders.get(key),
                }
            };

            const newUser = {
                id: 'user-456',
                email: 'new@company.com',
                name: 'New User',
                image: null,
            };

            // Get the mocked instances
            const { prisma } = await import('@/prisma');
            const { onCreateUser } = await import('@/lib/authUtils');
            
            vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.user.create).mockResolvedValue(newUser);

            // @ts-ignore - Testing the authorize function
            const result = await provider.authorize({}, mockRequest);

            expect(result).toEqual(newUser);
            expect(prisma.user.create).toHaveBeenCalledWith({
                data: {
                    email: 'new@company.com',
                    name: 'New User',
                    image: null,
                }
            });
            expect(onCreateUser).toHaveBeenCalledWith({ user: newUser });
        });

        it('should reject authentication with missing email header', async () => {
            const provider = getOAuth2ProxyProvider();
            const mockHeaders = new Map([
                ['X-Forwarded-User', 'testuser'],
                // Missing email header
            ]);

            const mockRequest = {
                headers: {
                    get: (key: string) => mockHeaders.get(key),
                }
            };

            // @ts-ignore - Testing the authorize function
            const result = await provider.authorize({}, mockRequest);

            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                "OAuth2 Proxy authentication failed: Missing or invalid email header"
            );
        });

        it('should reject authentication with invalid email format', async () => {
            const provider = getOAuth2ProxyProvider();
            const mockHeaders = new Map([
                ['X-Forwarded-User', 'testuser'],
                ['X-Forwarded-Email', 'invalid-email'],
            ]);

            const mockRequest = {
                headers: {
                    get: (key: string) => mockHeaders.get(key),
                }
            };

            // @ts-ignore - Testing the authorize function
            const result = await provider.authorize({}, mockRequest);

            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                "OAuth2 Proxy authentication failed: Invalid email format"
            );
        });

        it('should sanitize email addresses correctly', async () => {
            const provider = getOAuth2ProxyProvider();
            const mockHeaders = new Map([
                ['X-Forwarded-User', 'testuser'],
                ['X-Forwarded-Email', '  TEST@COMPANY.COM  '],
            ]);

            const mockRequest = {
                headers: {
                    get: (key: string) => mockHeaders.get(key),
                }
            };

            const existingUser = {
                id: 'user-123',
                email: 'test@company.com',
                name: 'Test User',
                image: null,
            };

            mockPrismaUser.findUnique.mockResolvedValue(existingUser);

            // @ts-ignore - Testing the authorize function
            const result = await provider.authorize({}, mockRequest);

            expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@company.com' }
            });
        });

        it('should update user name when it changes', async () => {
            const provider = getOAuth2ProxyProvider();
            const mockHeaders = new Map([
                ['X-Forwarded-User', 'testuser'],
                ['X-Forwarded-Email', 'test@company.com'],
                ['X-Forwarded-Preferred-Username', 'Updated Name'],
            ]);

            const mockRequest = {
                headers: {
                    get: (key: string) => mockHeaders.get(key),
                }
            };

            const existingUser = {
                id: 'user-123',
                email: 'test@company.com',
                name: 'Old Name',
                image: null,
            };

            mockPrismaUser.findUnique.mockResolvedValue(existingUser);

            // @ts-ignore - Testing the authorize function
            const result = await provider.authorize({}, mockRequest);

            expect(mockPrismaUser.update).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                data: { name: 'Updated Name' }
            });

            expect(result).toEqual({
                id: 'user-123',
                email: 'test@company.com',
                name: 'Updated Name',
                image: null,
            });
        });

        it('should handle groups parsing correctly', async () => {
            const provider = getOAuth2ProxyProvider();
            const mockHeaders = new Map([
                ['X-Forwarded-User', 'testuser'],
                ['X-Forwarded-Email', 'test@company.com'],
                ['X-Forwarded-Groups', 'group1, group2 ,group3'],
            ]);

            const mockRequest = {
                headers: {
                    get: (key: string) => mockHeaders.get(key),
                }
            };

            const existingUser = {
                id: 'user-123',
                email: 'test@company.com',
                name: 'Test User',
                image: null,
            };

            mockPrismaUser.findUnique.mockResolvedValue(existingUser);

            // @ts-ignore - Testing the authorize function
            await provider.authorize({}, mockRequest);

            // Verify groups are logged correctly
            expect(mockLogger.info).toHaveBeenCalledWith(
                "OAuth2 Proxy authentication for user: test@company.com, groups: group1, group2, group3"
            );
        });

        it('should handle database errors gracefully', async () => {
            const provider = getOAuth2ProxyProvider();
            const mockHeaders = new Map([
                ['X-Forwarded-User', 'testuser'],
                ['X-Forwarded-Email', 'test@company.com'],
            ]);

            const mockRequest = {
                headers: {
                    get: (key: string) => mockHeaders.get(key),
                }
            };

            mockPrismaUser.findUnique.mockRejectedValue(new Error('Database error'));

            // @ts-ignore - Testing the authorize function
            const result = await provider.authorize({}, mockRequest);

            expect(result).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Error processing OAuth2 Proxy authentication:",
                expect.any(Error)
            );
        });
    });

    describe('validateOAuth2ProxyConfig', () => {
        it('should validate configuration when OAuth2 Proxy is enabled', () => {
            expect(() => validateOAuth2ProxyConfig()).not.toThrow();
            expect(mockLogger.info).toHaveBeenCalledWith("OAuth2 Proxy authentication is enabled");
            expect(mockLogger.warn).toHaveBeenCalledWith(
                "⚠️  OAuth2 Proxy mode is enabled - ensure the following security measures are in place:"
            );
        });

        it('should throw error when required headers are missing', () => {
            vi.doMock('@/env.mjs', () => ({
                env: {
                    SOURCEBOT_TRUST_PROXY_HEADERS: 'true',
                    SOURCEBOT_PROXY_USER_HEADER: 'X-Forwarded-User',
                    // Missing SOURCEBOT_PROXY_EMAIL_HEADER
                }
            }));

            expect(() => validateOAuth2ProxyConfig()).toThrow(
                "SOURCEBOT_PROXY_EMAIL_HEADER must be configured when OAuth2 Proxy authentication is enabled"
            );
        });
    });

    describe('validateOAuth2ProxyHeaders', () => {
        it('should return true when OAuth2 Proxy is disabled', () => {
            vi.doMock('@/env.mjs', () => ({
                env: {
                    SOURCEBOT_TRUST_PROXY_HEADERS: 'false',
                }
            }));

            const headers = new Headers();
            const result = validateOAuth2ProxyHeaders(headers);
            expect(result).toBe(true);
        });

        it('should return true when all required headers are present', () => {
            const headers = new Headers();
            headers.set('X-Forwarded-Email', 'test@company.com');
            headers.set('X-Forwarded-User', 'testuser');

            const result = validateOAuth2ProxyHeaders(headers);
            expect(result).toBe(true);
        });

        it('should return false and log warning when headers are missing', () => {
            const headers = new Headers();
            headers.set('X-Forwarded-Email', 'test@company.com');
            // Missing X-Forwarded-User header

            const result = validateOAuth2ProxyHeaders(headers);
            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                "Request missing required OAuth2 Proxy headers - possible direct access attempt"
            );
        });

        it('should return false when no headers are present', () => {
            const headers = new Headers();

            const result = validateOAuth2ProxyHeaders(headers);
            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                "Request missing required OAuth2 Proxy headers - possible direct access attempt"
            );
        });
    });

    describe('Security Tests', () => {
        it('should prevent header injection attacks', async () => {
            const provider = getOAuth2ProxyProvider();
            const mockHeaders = new Map([
                ['X-Forwarded-User', 'testuser\nX-Admin: true'],
                ['X-Forwarded-Email', 'test@company.com\r\nAuthorization: Bearer fake'],
            ]);

            const mockRequest = {
                headers: {
                    get: (key: string) => mockHeaders.get(key),
                }
            };

            // @ts-ignore - Testing the authorize function
            const result = await provider.authorize({}, mockRequest);

            // Should reject due to invalid email format
            expect(result).toBeNull();
        });

        it('should handle empty and whitespace-only headers', async () => {
            const provider = getOAuth2ProxyProvider();
            const mockHeaders = new Map([
                ['X-Forwarded-User', '   '],
                ['X-Forwarded-Email', ''],
            ]);

            const mockRequest = {
                headers: {
                    get: (key: string) => mockHeaders.get(key),
                }
            };

            // @ts-ignore - Testing the authorize function
            const result = await provider.authorize({}, mockRequest);

            expect(result).toBeNull();
        });

        it('should validate email format strictly', async () => {
            const provider = getOAuth2ProxyProvider();
            const invalidEmails = [
                'notanemail',
                '@company.com',
                'user@',
                'user@@company.com',
                'user@company..com',
                'user space@company.com',
            ];

            for (const invalidEmail of invalidEmails) {
                const mockHeaders = new Map([
                    ['X-Forwarded-User', 'testuser'],
                    ['X-Forwarded-Email', invalidEmail],
                ]);

                const mockRequest = {
                    headers: {
                        get: (key: string) => mockHeaders.get(key),
                    }
                };

                // @ts-ignore - Testing the authorize function
                const result = await provider.authorize({}, mockRequest);

                expect(result).toBeNull();
            }
        });
    });
});