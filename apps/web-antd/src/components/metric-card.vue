<script lang="ts" setup>
import { Card, Tag } from 'ant-design-vue';

defineProps<{
  change?: string;
  label: string;
  meta?: string;
  tone?: 'negative' | 'neutral' | 'positive';
  value: string;
}>();
</script>

<template>
  <Card class="metric-card" :bordered="false">
    <div class="metric-card-head">
      <span class="metric-label">{{ meta }}</span>
      <Tag v-if="change" :color="tone === 'positive' ? 'green' : tone === 'negative' ? 'red' : 'default'">
        {{ change }}
      </Tag>
    </div>
    <div class="metric-value" :class="tone">{{ value }}</div>
    <strong>{{ label }}</strong>
  </Card>
</template>
