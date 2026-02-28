/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    workerThreads: true,
  },
};

module.exports = nextConfig;
