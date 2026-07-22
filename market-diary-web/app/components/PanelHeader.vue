<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
}>();
</script>

<template>
  <div class="panel-heading">
    <div>
      <span class="eyebrow">{{ eyebrow }}</span>
      <h2>{{ title }}</h2>
    </div>
    <slot />
  </div>
</template>
