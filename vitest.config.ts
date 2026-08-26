import { fileURLToPath } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "#": fileURLToPath(new URL("apps/web-antd/src", import.meta.url)),
      "@vben/request": fileURLToPath(
        new URL("packages/effects/request/src/index.ts", import.meta.url),
      ),
      "vue-router": fileURLToPath(
        new URL("apps/web-antd/node_modules/vue-router", import.meta.url),
      ),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.spec.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
});
