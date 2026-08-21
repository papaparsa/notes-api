/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiPort = process.env.API_PORT || '9801';
    return [
      {
        source: '/api/:path*',
        destination: `http://localhost:${apiPort}/api/:path*/`,
      },
      {
        source: '/media/:path*',
        destination: `http://localhost:${apiPort}/media/:path*/`,
      },
    ];
  },
  output: 'standalone',
}

module.exports = nextConfig
