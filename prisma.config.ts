import { defineConfig } from "prisma/config";

// process.env.DATABASE_URL is set by Vercel at build time (migrate deploy).
// During postinstall (prisma generate), a URL is not needed — use fallback.
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder",
  },
});
