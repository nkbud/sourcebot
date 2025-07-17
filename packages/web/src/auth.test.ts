import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env } from '@/env.mjs';

// Mock the env module
vi.mock('@/env.mjs', () => ({
  env: {
    AUTH_DEX_ISSUER_URL: undefined,
    AUTH_DEX_CLIENT_ID: undefined,
    AUTH_DEX_CLIENT_SECRET: undefined,
  }
}));

// Import the function we want to test
// Note: We need to import after the mock is set up
const { createDexProvider } = await import('@/auth');

describe('createDexProvider', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should return null when required environment variables are missing', () => {
    // Set up env with missing variables
    (env as any).AUTH_DEX_ISSUER_URL = undefined;
    (env as any).AUTH_DEX_CLIENT_ID = undefined;
    (env as any).AUTH_DEX_CLIENT_SECRET = undefined;

    const provider = createDexProvider();
    expect(provider).toBeNull();
  });

  it('should return null when only issuer URL is provided', () => {
    (env as any).AUTH_DEX_ISSUER_URL = 'https://dex.example.com';
    (env as any).AUTH_DEX_CLIENT_ID = undefined;
    (env as any).AUTH_DEX_CLIENT_SECRET = undefined;

    const provider = createDexProvider();
    expect(provider).toBeNull();
  });

  it('should return null when only client ID is provided', () => {
    (env as any).AUTH_DEX_ISSUER_URL = undefined;
    (env as any).AUTH_DEX_CLIENT_ID = 'test-client-id';
    (env as any).AUTH_DEX_CLIENT_SECRET = undefined;

    const provider = createDexProvider();
    expect(provider).toBeNull();
  });

  it('should return null when only client secret is provided', () => {
    (env as any).AUTH_DEX_ISSUER_URL = undefined;
    (env as any).AUTH_DEX_CLIENT_ID = undefined;
    (env as any).AUTH_DEX_CLIENT_SECRET = 'test-secret';

    const provider = createDexProvider();
    expect(provider).toBeNull();
  });

  it('should return configured provider when all required variables are provided', () => {
    (env as any).AUTH_DEX_ISSUER_URL = 'https://dex.example.com';
    (env as any).AUTH_DEX_CLIENT_ID = 'test-client-id';
    (env as any).AUTH_DEX_CLIENT_SECRET = 'test-secret';

    const provider = createDexProvider();

    expect(provider).not.toBeNull();
    expect(provider).toMatchObject({
      id: 'dex',
      name: 'Dex',
      type: 'oauth',
      clientId: 'test-client-id',
      clientSecret: 'test-secret',
      authorization: {
        url: 'https://dex.example.com/auth',
        params: {
          scope: 'openid email profile',
          response_type: 'code',
        },
      },
      token: 'https://dex.example.com/token',
      userinfo: 'https://dex.example.com/userinfo',
    });
    expect(typeof provider?.profile).toBe('function');
  });

  it('should configure correct endpoints with trailing slash in issuer URL', () => {
    (env as any).AUTH_DEX_ISSUER_URL = 'https://dex.example.com/';
    (env as any).AUTH_DEX_CLIENT_ID = 'test-client-id';
    (env as any).AUTH_DEX_CLIENT_SECRET = 'test-secret';

    const provider = createDexProvider();

    expect(provider?.authorization.url).toBe('https://dex.example.com//auth');
    expect(provider?.token).toBe('https://dex.example.com//token');
    expect(provider?.userinfo).toBe('https://dex.example.com//userinfo');
  });

  it('should map user profile correctly from ID token claims', () => {
    (env as any).AUTH_DEX_ISSUER_URL = 'https://dex.example.com';
    (env as any).AUTH_DEX_CLIENT_ID = 'test-client-id';
    (env as any).AUTH_DEX_CLIENT_SECRET = 'test-secret';

    const provider = createDexProvider();
    
    const mockProfile = {
      sub: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    };

    const mappedProfile = provider?.profile(mockProfile);

    expect(mappedProfile).toEqual({
      id: 'user-123',
      name: 'Test User',
      email: 'user@example.com',
      image: 'https://example.com/avatar.jpg',
    });
  });

  it('should handle missing picture in profile', () => {
    (env as any).AUTH_DEX_ISSUER_URL = 'https://dex.example.com';
    (env as any).AUTH_DEX_CLIENT_ID = 'test-client-id';
    (env as any).AUTH_DEX_CLIENT_SECRET = 'test-secret';

    const provider = createDexProvider();
    
    const mockProfile = {
      sub: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
      // picture is missing
    };

    const mappedProfile = provider?.profile(mockProfile);

    expect(mappedProfile).toEqual({
      id: 'user-123',
      name: 'Test User',
      email: 'user@example.com',
      image: null,
    });
  });

  it('should request correct OAuth2 scopes', () => {
    (env as any).AUTH_DEX_ISSUER_URL = 'https://dex.example.com';
    (env as any).AUTH_DEX_CLIENT_ID = 'test-client-id';
    (env as any).AUTH_DEX_CLIENT_SECRET = 'test-secret';

    const provider = createDexProvider();

    expect(provider?.authorization.params.scope).toBe('openid email profile');
    expect(provider?.authorization.params.response_type).toBe('code');
  });
});