/** @type {import('next').NextConfig} */
const backendTarget = (
  process.env.BACKEND_URL ||
  process.env.API_URL

)
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

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
