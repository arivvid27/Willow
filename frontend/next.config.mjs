/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "*.vercel.app",
        process.env.NEXT_PUBLIC_SITE_URL ?? "",
      ].filter(Boolean),
    },
  },
};

export default nextConfig;
