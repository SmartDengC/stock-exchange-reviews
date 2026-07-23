import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: "#imports",
        replacement: fileURLToPath(new URL("./tests/mocks/nuxt-imports.ts", import.meta.url)),
      },
      {
        find: "~",
        replacement: fileURLToPath(new URL("./app", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.spec.ts"],
  },
});
