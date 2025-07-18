import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { env } from './env.mjs'
import { SINGLE_TENANT_ORG_DOMAIN } from '@/lib/constants'
import { getUserFromRequest } from '@/lib/oauth2-proxy-auth'
import { createLogger } from '@sourcebot/logger'

const logger = createLogger('middleware');

export async function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();

    // Skip authentication for public paths
    if (
        url.pathname.startsWith('/api/health') ||
        url.pathname.startsWith('/api/public') ||
        url.pathname.startsWith('/_next') ||
        url.pathname.startsWith('/static') ||
        url.pathname.includes('.') // Skip for files (images, etc.)
    ) {
        return NextResponse.next();
    }

    // Check OAuth2 Proxy authentication
    const user = getUserFromRequest(request);
    
    if (!user) {
        logger.debug('No authenticated user found, OAuth2 Proxy should redirect to Okta');
        // OAuth2 Proxy will handle redirect to Okta for unauthenticated requests
        // We just let the request pass through - OAuth2 Proxy will intercept it
        return NextResponse.next();
    }

    logger.debug('Authenticated user found in middleware', { userId: user.id, email: user.email });

    // Handle tenancy mode routing
    if (env.SOURCEBOT_TENANCY_MODE !== 'single') {
        return NextResponse.next();
    }

    // Legacy login/signup routes should redirect to main app since OAuth2 Proxy handles auth
    if (
        url.pathname.startsWith('/login') ||
        url.pathname.startsWith('/signup')
    ) {
        logger.info('Redirecting legacy auth route to main app');
        url.pathname = `/${SINGLE_TENANT_ORG_DOMAIN}`;
        return NextResponse.redirect(url);
    }

    if (url.pathname.startsWith('/redeem')) {
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
        '/((?!api|_next/static|ingest|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|logo_192.png|logo_512.png|sb_logo_light_large.png|arrow.png|placeholder_avatar.png).*)',
    ],
}
