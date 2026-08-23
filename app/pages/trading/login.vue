<script setup lang="ts">
const route = useRoute();
const username = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");
const errorElement = ref<HTMLElement | null>(null);
const { fetch: refreshSession, loggedIn } = useUserSession();

useSeoMeta({
  title: "登录 · 市场日记",
  robots: "noindex, nofollow",
});

onMounted(async () => {
  await refreshSession().catch(() => undefined);
  if (loggedIn.value) {
    await navigateTo(String(route.query.returnTo || "/"));
  }
});

async function login() {
  if (!username.value || !password.value || loading.value) return;
  loading.value = true;
  error.value = "";
  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: { username: username.value, password: password.value },
    });
    await refreshSession();
    await navigateTo(String(route.query.returnTo || "/"));
  } catch (cause) {
    const value = cause as { data?: { message?: string }; message?: string };
    error.value = value.data?.message ?? value.message ?? "登录失败，请检查账号和密码后重试";
    await nextTick();
    errorElement.value?.focus();
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
        <p>请输入账号和密码进入研究终端。</p>
      </div>
      <form @submit.prevent="login">
        <label for="trading-username">账号</label>
        <input
          id="trading-username"
          v-model="username"
          name="username"
          type="text"
          autocomplete="username"
          spellcheck="false"
          required
          placeholder="输入账号…"
        >
        <label for="trading-password">密码</label>
        <input
          id="trading-password"
          v-model="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          placeholder="输入密码…"
        >
        <p v-if="error" ref="errorElement" class="form-error" role="alert" aria-live="polite" tabindex="-1">{{ error }}</p>
        <button class="trading-primary-button" type="submit" :disabled="loading">
          <span v-if="loading" class="button-spinner" aria-hidden="true" />
          {{ loading ? "正在验证…" : "登录" }}
        </button>
      </form>
    </section>
  </main>
</template>
