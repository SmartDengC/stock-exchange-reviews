import tailwindcss from "@tailwindcss/vite";
import { reviewRoute, reviews } from "./app/lib/reviews";
import { ADMIN_SESSION_MAX_AGE_SECONDS } from "./shared/auth-session";

const reportRoutes = reviews.map(reviewRoute);

export default defineNuxtConfig({
  compatibilityDate: "2026-07-22",
  devtools: { enabled: false },
  modules: ["@nuxt/eslint", "nuxt-auth-utils"],
  css: [
    "@arco-design/web-vue/dist/arco.css",
    "md-editor-v3/lib/style.css",
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
  routeRules: {
    "/": { prerender: true },
    "/report/**": { prerender: true },
  },
  runtimeConfig: {
    session: {
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    },
    adminPasswordHash: "",
    githubToken: "",
    githubOwner: "SmartDengC",
    githubRepo: "stock-exchange-reviews",
    githubBranch: "main",
  },
  app: {
    head: {
      htmlAttrs: { lang: "zh-CN", class: "light" },
      title: "市场日记 · 研究终端",
      meta: [
        { name: "description", content: "个人市场复盘与周度研究终端" },
        { name: "color-scheme", content: "light dark" },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      ],
    },
  },
});
