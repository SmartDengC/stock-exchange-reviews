<script setup lang="ts">
type ModuleKey = "research" | "trading";

const props = defineProps<{
  module: ModuleKey;
  title: string;
  subtitle?: string;
}>();

const route = useRoute();
const { fetch: refreshSession } = useUserSession();
const navOpen = ref(false);

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const researchLinks = [
  { to: "/#weekly-reviews", label: "周复盘", match: "weekly" },
  { to: "/#daily-reviews", label: "日复盘", match: "daily" },
];

const tradingLinks = [
  { to: "/trading", label: "交易总览" },
  { to: "/trading/trades", label: "交易记录" },
  { to: `/trading/daily/${today}`, label: "每日复盘", base: "/trading/daily" },
  { to: "/trading/analytics", label: "统计洞察" },
  { to: "/trading/settings", label: "设置与导出" },
];

const activeModule = computed<ModuleKey>(() => route.path.startsWith("/trading") ? "trading" : props.module);

function closeNav() {
  navOpen.value = false;
}

function researchActive(match: string) {
  if (route.path.startsWith("/report/weekly")) return match === "weekly";
  if (route.path.startsWith("/report/daily")) return match === "daily";
  if (route.path !== "/") return false;
  return match === "daily" ? route.hash === "#daily-reviews" : route.hash !== "#daily-reviews";
}

function tradingActive(link: { to: string; base?: string }) {
  if (link.to === "/trading") return route.path === "/trading";
  return route.path.startsWith(link.base ?? link.to);
}

async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  await refreshSession();
  await navigateTo("/login");
}
</script>

<template>
  <main id="main-content" class="app-shell unified-shell" :data-module="activeModule">
    <button type="button" class="unified-nav-trigger" aria-label="打开导航" @click="navOpen = true">
      <span />
      <span />
    </button>

    <div v-if="navOpen" class="unified-nav-backdrop" @click="navOpen = false" />

    <aside :class="['unified-side-rail', { 'is-open': navOpen }]" aria-label="市场日记导航">
      <div class="unified-side-head">
        <NuxtLink class="brand" to="/" @click="closeNav">
          <span class="brand-mark">M</span>
          <span>市场日记<small>MARKET DIARY</small></span>
        </NuxtLink>
        <button type="button" class="unified-nav-close" aria-label="关闭导航" @click="navOpen = false">
          <span />
          <span />
        </button>
      </div>

      <nav class="side-nav-groups" aria-label="工作台导航">
        <section>
          <p :class="{ active: activeModule === 'research' }">
            <i class="nav-glyph research" aria-hidden="true" /> 周度研究
          </p>
          <NuxtLink
            v-for="item in researchLinks"
            :key="item.to"
            :to="item.to"
            :class="{ active: researchActive(item.match) }"
            @click="closeNav"
          >
            {{ item.label }}
          </NuxtLink>
        </section>

        <section>
          <p :class="{ active: activeModule === 'trading' }">
            <i class="nav-glyph trading" aria-hidden="true" /> 交易复盘
          </p>
          <NuxtLink
            v-for="item in tradingLinks"
            :key="item.to"
            :to="item.to"
            :class="{ active: tradingActive(item) }"
            @click="closeNav"
          >
            {{ item.label }}
          </NuxtLink>
        </section>
      </nav>

      <div class="side-rail-actions">
        <ThemeToggle />
        <a
          class="secondary-link side-action-link"
          href="https://github.com/SmartDengC/stock-exchange-reviews"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <button type="button" class="secondary-link side-action-link danger" @click="logout">退出登录</button>
      </div>
    </aside>

    <section class="unified-workspace">
      <header class="workspace-header">
        <div>
          <div class="site-brand">个人研究与交易闭环</div>
          <h1>{{ title }}</h1>
          <p v-if="subtitle" class="meta-line">{{ subtitle }}</p>
        </div>
        <div class="workspace-actions">
          <slot name="actions" />
        </div>
      </header>

      <section class="unified-content">
        <slot />
      </section>

      <footer>本系统仅用于个人研究与历史复盘，不构成任何投资建议。<span>市场日记 · RESEARCH TO TRADING LOOP</span></footer>
    </section>
  </main>
</template>
