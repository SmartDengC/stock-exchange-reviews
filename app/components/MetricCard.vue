<script setup lang="ts">
defineProps<{
  asset: {
    label: string;
    market: string;
    value: string;
    change: string;
    tone: string;
    values: string[];
  };
}>();
</script>

<template>
  <article class="metric-card">
    <div class="metric-top">
      <span>{{ asset.market }}</span>
      <b :class="`tone-${asset.tone}`">{{ asset.change }}</b>
    </div>
    <div class="metric-value">{{ asset.value }}</div>
    <div class="metric-bottom">
      <strong>{{ asset.label }}</strong>
      <SparkBars :values="asset.values" />
    </div>
  </article>
</template>
