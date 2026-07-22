<script setup lang="ts">
const props = defineProps<{ values: string[] }>();

function numeric(value: string) {
  const number = Number.parseFloat(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

const numbers = computed(() => props.values.map(numeric).filter((value) => value > 0));
const heights = computed(() => {
  if (!numbers.value.length) return [];
  const min = Math.min(...numbers.value);
  const max = Math.max(...numbers.value);
  const range = max - min || 1;
  return numbers.value.map((value) => 24 + ((value - min) / range) * 76);
});
</script>

<template>
  <span v-if="!heights.length" class="spark-empty">数据待补充</span>
  <div v-else class="spark-bars" :aria-label="`本周走势：${values.join('、')}`">
    <i v-for="(height, index) in heights" :key="index" :style="{ height: `${height}%` }" />
  </div>
</template>
