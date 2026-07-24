<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  subtitle?: string;
}>();

const route = useRoute();
const { fetch: refreshSession } = useUserSession();
const navOpen = ref(false);

const links = [
  { to: "/trading", label: "交易总览", code: "01" },
  { to: "/trading/trades", label: "交易记录", code: "02" },
  { to: `/trading/daily/${new Date().toISOString().slice(0, 10)}`, label: "每日复盘", code: "03" },
  { to: "/trading/analytics", label: "统计洞察", code: "04" },
  { to: "/trading/settings", label: "设置与导出", code: "05" },
];

function active(to: string) {
  return to === "/trading"
    ? route.path === to
    : route.path.startsWith(to.replace(/\/\d{4}-\d{2}-\d{2}$/, ""));
}

async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  await refreshSession();
  await navigateTo("/trading/login");
}
</script>

<template>
  <main class="trading-app">
    <aside :class="['trading-sidebar', { 'is-open': navOpen }]">
      <div class="trading-brand-row">
        <NuxtLink class="trading-brand" to="/trading" @click="navOpen = false">
          <span class="brand-mark">M</span>
          <span>交易复盘<small>PRIVATE JOURNAL</small></span>
        </NuxtLink>
        <button type="button" class="mobile-nav-close" aria-label="关闭导航" @click="navOpen = false">×</button>
      </div>

      <nav class="trading-nav" aria-label="交易复盘导航">
        <NuxtLink
          v-for="item in links"
          :key="item.to"
          :to="item.to"
          :class="{ active: active(item.to) }"
          @click="navOpen = false"
        >
          <span>{{ item.code }}</span><b>{{ item.label }}</b>
        </NuxtLink>
      </nav>

      <div class="trading-side-note">
        <span class="status-dot" /> 管理员私有空间
        <small>交易与截图不会进入公开研究资料。</small>
      </div>

      <div class="trading-side-actions">
        <NuxtLink to="/">返回公开研究终端 ↗</NuxtLink>
        <button type="button" @click="logout">退出登录</button>
      </div>
    </aside>

    <div v-if="navOpen" class="trading-sidebar-backdrop" @click="navOpen = false" />

    <section class="trading-workspace">
      <header class="trading-topbar">
        <div class="trading-title-wrap">
          <button type="button" class="mobile-nav-trigger" aria-label="打开导航" @click="navOpen = true">☰</button>
          <div>
            <span class="eyebrow">{{ eyebrow }}</span>
            <h1>{{ title }}</h1>
            <p v-if="subtitle">{{ subtitle }}</p>
          </div>
        </div>
        <div class="trading-topbar-actions">
          <ThemeToggle />
          <slot name="actions" />
        </div>
      </header>

      <section class="trading-content">
        <slot />
      </section>
    </section>
  </main>
</template>
