await import("./src/env.mjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",

    // This is required when using standalone builds.
    // @see: https://env.t3.gg/docs/nextjs#create-your-schema
    transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"],

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ]
    },
};

export default nextConfig;