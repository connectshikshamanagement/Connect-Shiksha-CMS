/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Use HTTP (not HTTPS) for local development
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.2:10000/api',
  },
}

module.exports = nextConfig

