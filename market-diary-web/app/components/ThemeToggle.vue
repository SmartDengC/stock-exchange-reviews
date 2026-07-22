<script setup lang="ts">
const { theme, toggleTheme } = useTheme();
</script>

<template>
  <AButton
    class="theme-toggle"
    type="outline"
    size="small"
    :aria-label="`切换至${theme === 'light' ? '深色' : '浅色'}主题`"
    :title="`切换至${theme === 'light' ? '深色' : '浅色'}主题`"
    @click="toggleTheme"
  >
    <span aria-hidden="true">{{ theme === "light" ? "☀" : "☾" }}</span>
    <span>{{ theme === "light" ? "浅色" : "深色" }}</span>
  </AButton>
</template>
