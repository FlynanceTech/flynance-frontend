import withPWA from "next-pwa"
import createNextIntlPlugin from "next-intl/plugin"

const isDev = process.env.NODE_ENV !== "production"
const enablePwaInDev = process.env.NEXT_PUBLIC_ENABLE_PWA_DEV === "true"
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.builder.io", pathname: "/**" },
      { protocol: "https", hostname: "www.facebook.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },

  turbopack: {
    resolveAlias: {
      underscore: "lodash",
    },
    resolveExtensions: [".mdx", ".tsx", ".ts", ".jsx", ".js", ".json"],
  },
}

const withPWAConfig = withPWA({
  dest: "public",
  register: false,
  skipWaiting: true,
  disable: isDev && !enablePwaInDev,
  customWorkerDir: "worker",

  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
      handler: "NetworkOnly",
      options: {
        cacheName: "api-network-only",
      },
    },
  ],
})

export default withNextIntl(withPWAConfig(nextConfig))
