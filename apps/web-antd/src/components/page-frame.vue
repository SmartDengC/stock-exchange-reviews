<script lang="ts" setup>
defineProps<{
  kicker?: string;
  subtitle?: string;
  title: string;
}>();
</script>

<template>
  <main id="main-content" class="page-frame">
    <header class="page-header">
      <div>
        <div class="page-kicker">{{ kicker || 'MARKET DIARY' }}</div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="page-actions">
        <slot name="actions"></slot>
      </div>
    </header>
    <slot></slot>
  </main>
</template>
