/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Allow credentials to be sent to the backend
  async rewrites() {
    return [];
  },
};

export default nextConfig;
