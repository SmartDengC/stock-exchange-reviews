<script setup lang="ts">
import { Modal } from "@arco-design/web-vue";
import { useAccessibleDialog } from "~/composables/use-accessible-dialog";
import { useSessionTimeout } from "~/composables/use-session-timeout";
import { currentTradingDate } from "~/lib/trading";

type ModuleKey = "research" | "trading";

const props = defineProps<{
  module: ModuleKey;
  title: string;
  subtitle?: string;
}>();

const route = useRoute();
const { user, fetch: refreshSession } = useUserSession();
const { theme, setTheme } = useTheme();
const navOpen = ref(false);
const navCollapsed = ref(false);
const userMenuOpen = ref(false);
const settingsOpen = ref(false);
const today = ref("");
const navCloseButton = ref<HTMLElement | null>(null);
const settingsCloseButton = ref<HTMLElement | null>(null);
const userMenuButton = ref<HTMLElement | null>(null);
const userMenuPanel = ref<HTMLElement | null>(null);

const researchLinks = [
  { to: "/research/rules", label: "交易规则", match: "rules", icon: "rules" },
  { to: "/", label: "复盘总览", match: "overview", icon: "overview" },
  { to: "/research/weekly", label: "周复盘", match: "weekly", icon: "weekly" },
  { to: "/research/daily", label: "日复盘", match: "daily", icon: "daily" },
];

const tradingLinks = computed(() => [
  { to: "/trading", label: "交易总览", icon: "overview" },
  { to: "/trading/trades", label: "交易记录", icon: "ledger" },
  { to: today.value ? `/trading/daily/${today.value}` : "/trading", label: "每日复盘", base: "/trading/daily", icon: "journal" },
  { to: "/trading/analytics", label: "统计洞察", icon: "analytics" },
  { to: "/trading/settings", label: "设置与导出", icon: "settings" },
]);

const activeModule = computed<ModuleKey>(() => route.path.startsWith("/trading") ? "trading" : props.module);
const userName = computed(() => user.value?.username ?? "已登录用户");
const userInitial = computed(() => userName.value.trim().slice(0, 1).toUpperCase() || "M");

const sessionTimeout = useSessionTimeout(() => {
  Modal.warning({
    title: "Session 即将过期",
    content: "您已登录 55 分钟，Session 将在 5 分钟后过期。点击确定将跳转至登录页。",
    okText: "确定",
    cancelText: "稍后提醒",
    onOk: async () => {
      await $fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      await refreshSession();
      localStorage.removeItem("session_login_time");
      await navigateTo("/login?timeout=true");
    },
  });
});

onMounted(() => {
  today.value = currentTradingDate();
  navCollapsed.value = localStorage.getItem("market-diary:nav-collapsed") === "true";
  sessionTimeout.init();
});

onUnmounted(() => {
  sessionTimeout.stop();
});

watch(navCollapsed, (value) => {
  if (import.meta.client) localStorage.setItem("market-diary:nav-collapsed", String(value));
});

watch(() => route.fullPath, () => {
  userMenuOpen.value = false;
});

function closeNav() {
  navOpen.value = false;
}

function toggleNavCollapsed() {
  navCollapsed.value = !navCollapsed.value;
}

async function openSettings() {
  userMenuOpen.value = false;
  await nextTick();
  userMenuButton.value?.focus();
  settingsOpen.value = true;
}

function closeSettings() {
  settingsOpen.value = false;
}

const { dialogRef: navDialogRef, onDialogKeydown: onNavDialogKeydown } = useAccessibleDialog(navOpen, closeNav, navCloseButton, false);
const { dialogRef: settingsDialogRef, onDialogKeydown: onSettingsDialogKeydown } = useAccessibleDialog(settingsOpen, closeSettings, settingsCloseButton);

watch(userMenuOpen, async (open) => {
  if (!open) return;
  await nextTick();
  userMenuPanel.value?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
});

function onUserMenuKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    userMenuOpen.value = false;
    userMenuButton.value?.focus();
    return;
  }
  if (!userMenuPanel.value || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const items = [...userMenuPanel.value.querySelectorAll<HTMLElement>("[role='menuitem']")];
  if (!items.length) return;
  const current = items.indexOf(document.activeElement as HTMLElement);
  if (event.key === "Home") items[0]?.focus();
  else if (event.key === "End") items.at(-1)?.focus();
  else if (event.key === "ArrowDown") items[(current + 1 + items.length) % items.length]?.focus();
  else items[(current - 1 + items.length) % items.length]?.focus();
}

function researchActive(match: string) {
  if (match === "rules") return route.path.startsWith("/research/rules");
  if (match === "overview") return route.path === "/";
  if (match === "weekly") return route.path.startsWith("/research/weekly") || route.path.startsWith("/report/weekly");
  if (match === "daily") return route.path.startsWith("/research/daily") || route.path.startsWith("/report/daily");
  return false;
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
  <main id="main-content" :class="['app-shell unified-shell', { 'is-nav-collapsed': navCollapsed }]" :data-module="activeModule">
    <button type="button" class="unified-nav-trigger" aria-label="打开导航" @click="navOpen = true">
      <span />
      <span />
    </button>

    <button v-if="navOpen" type="button" class="unified-nav-backdrop" aria-label="关闭导航" @click="closeNav" />

    <aside
      ref="navDialogRef"
      :class="['unified-side-rail', { 'is-open': navOpen, 'is-collapsed': navCollapsed }]"
      aria-label="市场日记导航"
      :aria-modal="navOpen || undefined"
      :role="navOpen ? 'dialog' : undefined"
      :tabindex="navOpen ? -1 : undefined"
      @keydown="onNavDialogKeydown"
    >
      <div class="unified-side-head">
        <NuxtLink class="brand" to="/" @click="closeNav">
          <span class="brand-mark">M</span>
          <span class="brand-text">市场日记<small>MARKET DIARY</small></span>
        </NuxtLink>
        <button
          type="button"
          class="nav-collapse-toggle"
          :aria-label="navCollapsed ? '展开菜单栏' : '收起菜单栏'"
          :title="navCollapsed ? '展开菜单栏' : '收起菜单栏'"
          :aria-pressed="navCollapsed"
          @click="toggleNavCollapsed"
        >
          <span aria-hidden="true" />
        </button>
        <button ref="navCloseButton" type="button" class="unified-nav-close" aria-label="关闭导航" @click="closeNav">
          <span />
          <span />
        </button>
      </div>

      <nav class="side-nav-groups" aria-label="工作台导航">
        <section>
          <p>
            <i class="nav-glyph research" aria-hidden="true" />
            <span>周度研究</span>
          </p>
          <NuxtLink
            v-for="item in researchLinks"
            :key="item.to"
            :to="item.to"
            :class="{ active: researchActive(item.match) }"
            :aria-current="researchActive(item.match) ? 'page' : undefined"
            :title="navCollapsed ? item.label : undefined"
            @click="closeNav"
          >
            <i :class="['nav-item-icon', `icon-${item.icon}`]" aria-hidden="true" />
            <span class="nav-label">{{ item.label }}</span>
          </NuxtLink>
        </section>

        <section>
          <p>
            <i class="nav-glyph trading" aria-hidden="true" />
            <span>交易复盘</span>
          </p>
          <NuxtLink
            v-for="item in tradingLinks"
            :key="item.to"
            :to="item.to"
            :class="{ active: tradingActive(item) }"
            :aria-current="tradingActive(item) ? 'page' : undefined"
            :title="navCollapsed ? item.label : undefined"
            @click="closeNav"
          >
            <i :class="['nav-item-icon', `icon-${item.icon}`]" aria-hidden="true" />
            <span class="nav-label">{{ item.label }}</span>
          </NuxtLink>
        </section>
      </nav>

      <div class="side-user-dock">
        <div v-if="userMenuOpen" ref="userMenuPanel" class="user-menu-panel" role="menu" @keydown="onUserMenuKeydown">
          <div class="user-menu-head">
            <span class="user-avatar">{{ userInitial }}</span>
            <span><strong>{{ userName }}</strong><small>市场日记账户</small></span>
          </div>
          <button type="button" class="user-menu-item" role="menuitem" @click="openSettings">
            <i class="menu-icon icon-settings" aria-hidden="true" />
            设置
          </button>
          <a
            class="user-menu-item"
            href="https://github.com/SmartDengC/stock-exchange-reviews"
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
          >
            <i class="menu-icon icon-github" aria-hidden="true" />
            GitHub
          </a>
          <button type="button" class="user-menu-item danger" role="menuitem" @click="logout">
            <i class="menu-icon icon-logout" aria-hidden="true" />
            退出登录
          </button>
        </div>

        <button
          ref="userMenuButton"
          type="button"
          class="user-card-button"
          :aria-expanded="userMenuOpen"
          aria-haspopup="menu"
          :title="navCollapsed ? userName : undefined"
          @click="userMenuOpen = !userMenuOpen"
        >
          <span class="user-avatar">{{ userInitial }}</span>
          <span class="user-card-text"><strong>{{ userName }}</strong><small>个人工作台</small></span>
          <span class="user-card-help" aria-hidden="true">?</span>
        </button>
      </div>
    </aside>

    <Teleport to="body">
      <div v-if="settingsOpen" class="settings-layer">
        <button type="button" class="settings-backdrop" aria-label="关闭设置" @click="closeSettings" />
        <section
          ref="settingsDialogRef"
          class="settings-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-settings-title"
          tabindex="-1"
          @keydown="onSettingsDialogKeydown"
        >
          <header>
            <div>
              <p class="site-brand">SETTINGS</p>
              <h2 id="app-settings-title">偏好设置</h2>
            </div>
            <button ref="settingsCloseButton" type="button" class="settings-close" aria-label="关闭设置" @click="closeSettings">
              <span />
              <span />
            </button>
          </header>
          <div class="settings-section">
            <div>
              <h3>颜色模式</h3>
              <p>选择日常复盘时更舒服的界面颜色。</p>
            </div>
            <div class="theme-choice-grid" role="group" aria-label="颜色模式">
              <button type="button" :class="{ active: theme === 'light' }" :aria-pressed="theme === 'light'" @click="setTheme('light')">
                <span class="theme-swatch light" aria-hidden="true" />
                <strong>浅色</strong>
                <small>明亮背景，适合白天整理资料。</small>
              </button>
              <button type="button" :class="{ active: theme === 'dark' }" :aria-pressed="theme === 'dark'" @click="setTheme('dark')">
                <span class="theme-swatch dark" aria-hidden="true" />
                <strong>深色</strong>
                <small>低亮度背景，适合夜间复盘。</small>
              </button>
            </div>
          </div>
        </section>
      </div>
    </Teleport>

    <section class="unified-workspace" :inert="navOpen || undefined">
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
