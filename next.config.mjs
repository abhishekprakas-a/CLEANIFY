import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Custom service-worker logic (push + background sync) lives in worker/index.js
  customWorkerDir: "worker",
  // Serve the offline page when a navigation request fails with no cache.
  fallbacks: {
    document: "/offline",
  },
  runtimeCaching: [
    {
      // App shell / pages — network first, fall back to cache offline.
      urlPattern: ({ request }) => request.mode === "navigate",
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      // Read-only job/attendance data — network first so the last response is
      // available offline.
      urlPattern: /\/api\/(jobs|attendance|auth\/me)\b/,
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "api-data",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 100, maxAgeSeconds: 6 * 60 * 60 },
      },
    },
    {
      // Static assets.
      urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-assets",
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
});

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy. Locks down the structural vectors (base-uri,
 * object/embed, framing, form targets) and constrains where scripts, styles,
 * images and connections may come from. `unsafe-inline` is required for Next's
 * inline hydration/runtime; `unsafe-eval` and ws: are dev-only (React Refresh /
 * HMR) and dropped in production.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  `connect-src 'self' https:${isProd ? "" : " ws: wss:"}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
]
  .join("; ")
  .concat(isProd ? "; upgrade-insecure-requests" : "");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Field app needs camera (photos) + geolocation (attendance/photo geo).
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(self), microphone=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained build for Docker / container deploys.
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["mongoose"],
  images: {
    formats: ["image/avif", "image/webp"],
    // The app serves images via plain <img> (S3 public URLs), not next/image,
    // so no remote hosts are allowed through the optimizer — this closes the
    // `/_next/image?url=<any-host>` open-proxy / SSRF / bandwidth-abuse vector.
    remotePatterns: [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withPWA(nextConfig);
