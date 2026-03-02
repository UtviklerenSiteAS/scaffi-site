import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-neon",
    "prisma",
    "@anthropic-ai/sdk",
    "@google/genai",
    "@google/generative-ai",
  ],
  outputFileTracingExcludes: {
    "*": [
      "./node_modules/.prisma/client/libquery_engine*",
      "./node_modules/prisma/libquery_engine*",
      "./node_modules/@prisma/engines/**",
      "./node_modules/prisma/node_modules/**",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
