import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "",
  },
  strict: true,
  verbose: true,
});
