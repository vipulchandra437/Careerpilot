/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
  // Allow the proxy to forward the full request body for uploads around/above
  // 10MB to the backend so the backend's own "File size must be under 10MB"
  // validation is the one that responds, rather than Next truncating the body
  // and failing the proxy with a generic 500.
  experimental: {
    middlewareClientMaxBodySize: "12mb",
  },
};

module.exports = nextConfig;
