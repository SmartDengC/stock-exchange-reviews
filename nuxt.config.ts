import tailwindcss from "@tailwindcss/vite";
import { reviewRoute, reviews } from "./app/lib/reviews";

const reportRoutes = reviews.map(reviewRoute);

export default defineNuxtConfig({
  compatibilityDate: "2026-07-22",
  devtools: { enabled: false },
  modules: ["@nuxt/eslint"],
  css: [
    "@arco-design/web-vue/dist/arco.css",
    "~/assets/css/main.css",
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  typescript: {
    strict: true,
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ["/", ...reportRoutes],
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: "zh-CN", class: "light" },
      title: "市场日记 · 研究终端",
      meta: [
        { name: "description", content: "个人市场复盘与周度研究终端" },
        { name: "color-scheme", content: "light dark" },
      ],
    },
  },
});
