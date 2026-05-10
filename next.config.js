/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // node:sqlite is a built-in module — exclude from bundling.
  webpack: (config) => {
    config.externals = [...(config.externals || []), { "node:sqlite": "commonjs node:sqlite" }];
    return config;
  },
};

module.exports = nextConfig;
