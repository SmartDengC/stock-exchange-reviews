<script setup lang="ts">
const route = useRoute();
const username = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");
const isTimeout = computed(() => route.query.timeout === "true");

const { fetch: refreshSession, loggedIn } = useUserSession();

useSeoMeta({
  title: "登录 · 市场日记",
  robots: "noindex, nofollow",
});

// 在客户端检查登录状态
if (import.meta.client) {
  await refreshSession().catch(() => undefined);
  if (loggedIn.value) {
    await navigateTo(String(route.query.returnTo || "/research/rules"));
  }
}

async function login() {
  if (!username.value || !password.value || loading.value) return;
  loading.value = true;
  error.value = "";
  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: { username: username.value, password: password.value },
    });
    if (import.meta.client) {
      localStorage.setItem("session_login_time", String(Date.now()));
      // 用完整页面跳转（非 SPA 导航），确保 session cookie 在所有浏览器中被正确携带。
      // navigateTo() 是 SPA 导航，Safari ITP 可能阻止 fetch 请求携带 cookie。
      window.location.href = String(route.query.returnTo || "/research/rules");
    }
  } catch (cause) {
    const value = cause as { data?: { message?: string }; message?: string };
    error.value = value.data?.message ?? value.message ?? "登录失败";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main id="main-content" class="trading-login-page">
    <section class="trading-login-card">
      <NuxtLink class="trading-brand" to="/">
        <span class="brand-mark">M</span>
        <span>市场日记<small>MARKET DIARY</small></span>
      </NuxtLink>
      <div class="trading-login-copy">
        <span class="eyebrow">WELCOME</span>
        <h1>登录市场日记</h1>
        <p v-if="isTimeout" class="timeout-notice">Session 已过期，请重新登录。</p>
        <p v-else>请输入账号和密码进入研究终端。</p>
      </div>
      <form @submit.prevent="login">
        <label for="login-username">账号</label>
        <input
          id="login-username"
          v-model="username"
          type="text"
          autocomplete="username"
          autofocus
          placeholder="输入账号"
        >
        <label for="login-password">密码</label>
        <input
          id="login-password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="输入密码"
        >
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="trading-primary-button" type="submit" :disabled="loading || !username || !password">
          {{ loading ? "正在验证…" : "登录" }}
        </button>
      </form>
    </section>
  </main>
</template>
