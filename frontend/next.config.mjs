/** @type {import('next').NextConfig} */
const rawBackend = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
const backendTarget = rawBackend.replace(/\/+$/, '').replace(/\/api$/, '');

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
