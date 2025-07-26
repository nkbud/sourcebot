await import("./src/env.mjs");
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",

    // This is required when using standalone builds.
    // @see: https://env.t3.gg/docs/nextjs#create-your-schema
    transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"],

    experimental: {
        // Improve ESM handling
        esmExternals: true,
    },

    webpack: (config, { isServer, dev }) => {
        // For client-side builds, completely avoid Node.js modules
        if (!isServer) {
            // Set externals to avoid bundling Node.js modules
            const originalExternals = config.externals || [];
            config.externals = [
                ...originalExternals,
                // Exclude winston and related packages
                function ({ context, request }, callback) {
                    if (/^(winston|@logtail\/winston|@logtail\/node|triple-beam)$/.test(request)) {
                        return callback(null, 'commonjs ' + request);
                    }
                    callback();
                }
            ];

            // Comprehensive fallbacks for Node.js built-ins
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
                os: false,
                path: false,
                stream: false,
                winston: false,
                '@logtail/winston': false,
                '@logtail/node': false,
                'triple-beam': false,
            };
            
            // Replace @sourcebot/logger module entirely
            config.resolve.alias = {
                ...config.resolve.alias,
                // Use exact match to avoid conflicts
                '@sourcebot/logger$': require.resolve('./src/lib/logger-browser.ts'),
            };

            // Add a condition to ignore certain warnings about externals
            config.stats = {
                ...config.stats,
                warningsFilter: [
                    'Module not found: Can\'t resolve \'winston\'',
                    'Module not found: Can\'t resolve \'@logtail/winston\'',
                    'Module not found: Can\'t resolve \'triple-beam\'',
                ],
            };
        }
        return config;
    },

    // @see : https://posthog.com/docs/advanced/proxy/nextjs
    async rewrites() {
        return [
            {
                source: "/ingest/static/:path*",
                destination: `https://us-assets.i.posthog.com/static/:path*`,
            },
            {
                source: "/ingest/:path*",
                destination: `https://us.i.posthog.com/:path*`,
            },
            {
                source: "/ingest/decide",
                destination: `https://us.i.posthog.com/decide`,
            },
        ];
    },
    // This is required to support PostHog trailing slash API requests
    skipTrailingSlashRedirect: true,

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ]
    },
};

export default withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_WEBAPP_PROJECT,
    authToken: process.env.SENTRY_SMUAT,
    release: process.env.SENTRY_RELEASE,

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
        enabled: true,
    },

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
});