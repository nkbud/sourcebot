import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { env } from './env.mjs'
import { SINGLE_TENANT_ORG_DOMAIN } from '@/lib/constants'
import { validateOAuth2ProxyHeaders } from '@/lib/oauth2ProxyAuth'

export async function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();

    // OAuth2 Proxy security validation
    // When OAuth2 Proxy mode is enabled, validate that requests have required headers
    // This prevents direct access attempts that bypass OAuth2 Proxy authentication
    if (env.SOURCEBOT_TRUST_PROXY_HEADERS === 'true') {
        const isValidOAuth2ProxyRequest = validateOAuth2ProxyHeaders(request.headers);
        
        // Allow certain paths without OAuth2 Proxy headers (API health checks, etc.)
        const allowedPaths = [
            '/api/health',
            '/api/version',
            '/_next/',
            '/favicon.ico',
            '/robots.txt',
            '/sitemap.xml',
            '/manifest.json'
        ];
        
        const isAllowedPath = allowedPaths.some(path => url.pathname.startsWith(path));
        
        if (!isValidOAuth2ProxyRequest && !isAllowedPath) {
            // Return 403 Forbidden for direct access attempts
            return new NextResponse('Direct access not allowed. Please access through OAuth2 Proxy.', {
                status: 403,
                headers: {
                    'Content-Type': 'text/plain',
                },
            });
        }
    }

    if (env.SOURCEBOT_TENANCY_MODE !== 'single') {
        return NextResponse.next();
    }

    if (
        url.pathname.startsWith('/login') ||
        url.pathname.startsWith('/redeem') ||
        url.pathname.startsWith('/signup') ||
        url.pathname.startsWith('/invite') ||
        url.pathname.startsWith('/onboard')
    ) {
        return NextResponse.next();
    }

    const pathSegments = url.pathname.split('/').filter(Boolean);
    const currentDomain = pathSegments[0];

    // If we're already on the correct domain path, allow
    if (currentDomain === SINGLE_TENANT_ORG_DOMAIN) {
        return NextResponse.next();
    }

    url.pathname = `/${SINGLE_TENANT_ORG_DOMAIN}${pathSegments.length > 1 ? '/' + pathSegments.slice(1).join('/') : ''}`;
    return NextResponse.redirect(url);
}

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: [
        '/((?!api|_next/static|ingest|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|logo_192.png|logo_512.png|sb_logo_light_large.png|arrow.png|placeholder_avatar.png|sb_logo_dark_small.png|sb_logo_light_small.png).*)',
    ],
}
