import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2026-07-22",
  devtools: { enabled: false },
  modules: ["@nuxt/eslint", "nuxt-auth-utils"],
  css: [
    "@arco-design/web-vue/dist/arco.css",
    "~/assets/css/main.css",
    "~/assets/css/trading.css",
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
      routes: ["/"],
    },
  },
  routeRules: {
    "/": { prerender: false },
    "/login": { prerender: false },
    "/report/**": { prerender: false },
    "/trading/**": { ssr: true, prerender: false, headers: { "cache-control": "private, no-store" } },
    "/api/trading/**": { headers: { "cache-control": "private, no-store" } },
  },
  runtimeConfig: {
    username: "",
    password: "",
    githubToken: "",
    githubOwner: "SmartDengC",
    githubRepo: "stock-exchange-reviews",
    githubBranch: "main",
    databaseUrl: "",
    blobReadWriteToken: "",
  },
  app: {
    head: {
      htmlAttrs: { lang: "zh-CN", class: "light" },
      title: "市场日记 · 研究终端",
      meta: [
        { name: "description", content: "个人市场复盘与周度研究终端" },
        { name: "color-scheme", content: "light dark" },
        { property: "og:title", content: "市场日记 · 研究终端" },
        { property: "og:description", content: "个人市场研究、日报周报与私有交易复盘终端" },
        { property: "og:image", content: "/og.png" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      ],
    },
  },
});
