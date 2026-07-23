<script setup lang="ts">
const route = useRoute();
const password = ref("");
const loading = ref(false);
const error = ref("");
const { fetch: refreshSession, loggedIn } = useUserSession();

useSeoMeta({
  title: "管理员登录 · 私有交易复盘",
  robots: "noindex, nofollow",
});

onMounted(async () => {
  await refreshSession().catch(() => undefined);
  if (loggedIn.value) await navigateTo(String(route.query.returnTo || "/trading"));
});

async function login() {
  if (!password.value || loading.value) return;
  loading.value = true;
  error.value = "";
  try {
    await $fetch("/api/auth/login", { method: "POST", body: { password: password.value } });
    await refreshSession();
    await navigateTo(String(route.query.returnTo || "/trading"));
  } catch (cause) {
    const value = cause as { data?: { message?: string }; message?: string };
    error.value = value.data?.message ?? value.message ?? "登录失败";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="trading-login-page">
    <section class="trading-login-card">
      <NuxtLink class="trading-brand" to="/">
        <span class="brand-mark">M</span>
        <span>市场日记<small>PRIVATE TRADING JOURNAL</small></span>
      </NuxtLink>
      <div class="trading-login-copy">
        <span class="eyebrow">ADMIN ONLY</span>
        <h1>进入私有交易复盘</h1>
        <p>逐笔交易、盈亏和行情截图仅在管理员会话中可见。</p>
      </div>
      <form @submit.prevent="login">
        <label for="trading-password">管理员密码</label>
        <input
          id="trading-password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          autofocus
          placeholder="输入管理员密码"
        >
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="trading-primary-button" type="submit" :disabled="loading || !password">
          {{ loading ? "正在验证…" : "安全登录" }}
        </button>
      </form>
      <p class="trading-login-foot">会话在 30 分钟无操作后自动退出。</p>
    </section>
  </main>
</template>
