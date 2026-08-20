<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <AppShell module="trading" :title="title" :subtitle="subtitle">
    <template #actions>
      <slot name="actions" />
    </template>

    <section class="trading-app">
      <section class="trading-content">
        <slot />
      </section>
    </section>
  </AppShell>
</template>
