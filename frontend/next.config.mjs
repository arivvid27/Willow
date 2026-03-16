/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for static export when hosting on Firebase Hosting
  output: process.env.NEXT_OUTPUT === "export" ? "export" : undefined,
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "*.web.app",          // Firebase Hosting
        "*.firebaseapp.com",  // Firebase Hosting (alternate)
        "*.vercel.app",       // Vercel (if used)
        process.env.NEXT_PUBLIC_SITE_URL ?? "",
      ].filter(Boolean),
    },
  },
};

export default nextConfig;
