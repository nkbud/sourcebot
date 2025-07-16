# Sourcebot Telemetry and Network Audit Report

This document provides a comprehensive audit of all telemetry, analytics, and outbound network requests in the Sourcebot codebase that could be considered "phoning home" or sending data to third-party services.

## Executive Summary

The Sourcebot application includes three main categories of outbound data transmission:

1. **PostHog Analytics** - Comprehensive user behavior and system event tracking
2. **Sentry Error Reporting** - Error and exception monitoring 
3. **Logtail Logging** - Centralized log aggregation service

All of these services can be disabled through environment variables, and PostHog telemetry specifically can be disabled with `SOURCEBOT_TELEMETRY_DISABLED=true`.

## 1. PostHog Telemetry

### Configuration Files

#### Backend Configuration
**File:** `packages/backend/src/posthog.ts`
```typescript
let posthog: PostHog | undefined = undefined;

if (env.NEXT_PUBLIC_POSTHOG_PAPIK) {
    posthog = new PostHog(
        env.NEXT_PUBLIC_POSTHOG_PAPIK,
        {
            host: "https://us.i.posthog.com",
        }
    );
}
```

**Destination:** `https://us.i.posthog.com`  
**Purpose:** Server-side event tracking for repository management and connection sync events  
**Disable with:** `SOURCEBOT_TELEMETRY_DISABLED=true`

#### Frontend Configuration
**File:** `packages/web/src/app/posthogProvider.tsx`
```typescript
posthog.init(env.NEXT_PUBLIC_POSTHOG_PAPIK, {
    // Routes to "/ingest" path which forwards to PostHog
    api_host: "/ingest",
    person_profiles: 'identified_only',
    capture_pageview: false,
    autocapture: false,
});
```

**Destination:** PostHog via `/ingest` endpoint proxy  
**Purpose:** Client-side user interaction and behavior tracking  
**Disable with:** Setting `disabled` prop to `true` or not providing `NEXT_PUBLIC_POSTHOG_PAPIK`

### Backend Events Tracked

**File:** `packages/backend/src/posthogEvents.ts`

The backend tracks the following events:
- `repo_created` - When repositories are created (includes VCS type and code host)
- `repo_deleted` - When repositories are deleted
- `backend_connection_sync_job_failed` - Connection sync failures with error details
- `backend_connection_sync_job_completed` - Successful connection syncs with repo count
- `backend_revisions_truncated` - When repository revisions are truncated

**Usage Locations:**
- `packages/backend/src/connectionManager.ts:313` - Connection sync completion
- `packages/backend/src/connectionManager.ts:332` - Connection sync failures  
- `packages/backend/src/zoekt.ts:53` - Revision truncation events

### Frontend Events Tracked

**File:** `packages/web/src/lib/posthogEvents.ts`

The frontend tracks extensive user interactions including:

#### Search and Core Functionality
- `search_finished` - Search completion with detailed performance metrics
- `share_link_created` - When users create share links
- `$pageview` - Page navigation tracking

#### User Interface Interactions (wa_ prefixed events)
- Connection management: creation, deletion, retry operations
- Secret management: creation, deletion, import operations  
- Billing and subscription operations
- Team management: invitations, member removal, ownership transfer
- Authentication events: login with various providers
- Onboarding flow interactions
- API key management
- Code navigation: find references, goto definition

**Major Usage Locations:**
- Throughout `/packages/web/src/ee/` - Enterprise edition features
- `/packages/web/src/app/[domain]/` - Domain-specific user interactions
- Search components and hooks

### Event Capture Implementation

**File:** `packages/web/src/hooks/useCaptureEvent.ts`
```typescript
export function captureEvent<E extends PosthogEvent>(event: E, properties: PosthogEventMap[E], options?: CaptureOptions) {
    posthog.capture(event, {
        ...properties,
        sourcebot_version: env.NEXT_PUBLIC_SOURCEBOT_VERSION,
    }, options);
}
```

**Data Sent:** Event name, event-specific properties, and Sourcebot version

## 2. Sentry Error Reporting

### Configuration Files

#### Client-side Configuration
**File:** `packages/web/sentry.client.config.ts`
```typescript
if (!!process.env.NEXT_PUBLIC_SENTRY_WEBAPP_DSN && !!process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT) {
    Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_WEBAPP_DSN,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    });
}
```

#### Server-side Configuration  
**File:** `packages/web/sentry.server.config.ts`
**File:** `packages/web/sentry.edge.config.ts`

#### Backend Configuration
**File:** `packages/backend/src/instrument.ts`
```typescript
if (!!env.NEXT_PUBLIC_SENTRY_BACKEND_DSN && !!env.NEXT_PUBLIC_SENTRY_ENVIRONMENT) {
    Sentry.init({
        dsn: env.NEXT_PUBLIC_SENTRY_BACKEND_DSN,
        environment: env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    });
}
```

**Destination:** External Sentry service (URL determined by DSN)  
**Purpose:** Error and exception monitoring  
**Disable with:** Not setting `NEXT_PUBLIC_SENTRY_WEBAPP_DSN` or `NEXT_PUBLIC_SENTRY_BACKEND_DSN`

### Usage Locations

Sentry is used extensively throughout the codebase for error capture:

#### Backend Error Capture
- `packages/backend/src/gerrit.ts` - Gerrit API errors
- `packages/backend/src/gitlab.ts` - GitLab API errors  
- `packages/backend/src/github.ts` - GitHub API errors
- `packages/backend/src/bitbucket.ts` - Bitbucket API errors
- `packages/backend/src/gitea.ts` - Gitea API errors
- `packages/backend/src/connectionManager.ts` - Connection management errors
- `packages/backend/src/repoManager.ts` - Repository management errors

#### Frontend Error Capture
- `packages/web/src/actions.ts` - Server action errors
- `packages/web/src/features/search/searchApi.ts` - Search API errors
- `packages/web/src/app/error.tsx` - React error boundaries
- `packages/web/src/app/global-error.tsx` - Global error handling

## 3. Logtail Logging Service

### Configuration

**File:** `packages/logger/src/index.ts`
```typescript
...(env.LOGTAIL_TOKEN && env.LOGTAIL_HOST ? [
    new LogtailTransport(
        new Logtail(env.LOGTAIL_TOKEN, {
            endpoint: env.LOGTAIL_HOST,
        })
    )
] : [])
```

**Destination:** External Logtail service (URL specified by `LOGTAIL_HOST`)  
**Purpose:** Centralized log aggregation and monitoring  
**Disable with:** Not setting `LOGTAIL_TOKEN` or `LOGTAIL_HOST`

**Environment Variables:**
- `LOGTAIL_TOKEN` - Authentication token for Logtail service
- `LOGTAIL_HOST` - Logtail service endpoint URL

## 4. External URLs and Assets

### Documentation and Website Links
Various UI components include links to external Sourcebot resources:

- `https://docs.sourcebot.dev/*` - Documentation links
- `https://sourcebot.dev/contact` - Contact page  
- `https://demo.sourcebot.dev` - Demo instance

**Files containing these links:**
- `packages/web/src/lib/newsData.ts` - News and feature announcements
- `packages/web/src/ee/features/analytics/analyticsEntitlementMessage.tsx`
- `packages/web/src/emails/emailFooter.tsx`
- Various onboarding and settings pages

### Image Assets
**File:** `packages/web/src/emails/constants.ts`
```typescript
export const SOURCEBOT_LOGO_LIGHT_LARGE_URL = "https://framerusercontent.com/images/hFtwmNtuQSpgYuypFCICKr384.png";
export const SOURCEBOT_ARROW_IMAGE_URL = "https://framerusercontent.com/images/hEk6w8i85onEQ3mrn1jhHzq8c.png";
export const SOURCEBOT_PLACEHOLDER_AVATAR_URL = "https://framerusercontent.com/images/YW1HBfmcq7oLix1MFvLJObMv4Q.png";
```

**Destination:** `framerusercontent.com`  
**Purpose:** Email template images and UI assets

## 5. Internal API Requests (Not External)

### MCP (Model Context Protocol) Client
**File:** `packages/mcp/src/client.ts`

Makes requests to:
- `${env.SOURCEBOT_HOST}/api/search`
- `${env.SOURCEBOT_HOST}/api/repos` 
- `${env.SOURCEBOT_HOST}/api/source`

**Note:** These are internal API calls to the Sourcebot instance itself, not external third-party services.

## Summary and Recommendations

### Services That "Phone Home"
1. **PostHog Analytics** - Comprehensive behavior tracking to `us.i.posthog.com`
2. **Sentry Error Reporting** - Exception monitoring to external Sentry service
3. **Logtail Logging** - Log aggregation to external Logtail service

### Third-Party Dependencies
The following NPM packages are used for external service communication:

#### PostHog Analytics
- **Backend:** `posthog-node@^4.2.1` (packages/backend/package.json)
- **Frontend:** `posthog-js@^1.161.5` (packages/web/package.json)

#### Sentry Error Reporting  
- **Backend:** `@sentry/node@^9.3.0`, `@sentry/profiling-node@^9.3.0` (packages/backend/package.json)
- **Frontend:** `@sentry/nextjs@^9` (packages/web/package.json)

#### Logtail Logging
- **Logger Package:** `@logtail/node@^0.5.2`, `@logtail/winston@^0.5.2` (packages/logger/package.json)

### Privacy Controls
All telemetry and external services can be disabled through environment variables:

- **PostHog:** Set `SOURCEBOT_TELEMETRY_DISABLED=true`
- **Sentry:** Do not provide DSN environment variables (`NEXT_PUBLIC_SENTRY_WEBAPP_DSN`, `NEXT_PUBLIC_SENTRY_BACKEND_DSN`)
- **Logtail:** Do not provide `LOGTAIL_TOKEN` or `LOGTAIL_HOST`

### Data Sensitivity Assessment
- **PostHog:** Collects usage patterns, feature adoption, and system performance metrics. No source code content is transmitted.
- **Sentry:** Collects error messages and stack traces which could potentially contain sensitive information from repository operations.
- **Logtail:** Collects application logs which may contain various operational data and potentially sensitive debugging information.

### Environment Variables for External Services

| Service | Environment Variable | Purpose | Default |
|---------|---------------------|---------|---------|
| PostHog | `NEXT_PUBLIC_POSTHOG_PAPIK` | PostHog API key | Not set |
| PostHog | `SOURCEBOT_TELEMETRY_DISABLED` | Disable all telemetry | `false` |
| PostHog | `SOURCEBOT_INSTALL_ID` | Installation identifier | `unknown` |
| Sentry | `NEXT_PUBLIC_SENTRY_WEBAPP_DSN` | Frontend Sentry DSN | Not set |
| Sentry | `NEXT_PUBLIC_SENTRY_BACKEND_DSN` | Backend Sentry DSN | Not set |
| Sentry | `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Sentry environment tag | Not set |
| Logtail | `LOGTAIL_TOKEN` | Logtail authentication | Not set |
| Logtail | `LOGTAIL_HOST` | Logtail service endpoint | Not set |

### Documentation Reference
The README.md mentions telemetry collection and provides a link to telemetry documentation:
> Sourcebot collects anonymous usage data by default to help us improve the product. No sensitive data is collected, but if you'd like to disable this you can do so by setting the `SOURCEBOT_TELEMETRY_DISABLED` environment variable to `true`.