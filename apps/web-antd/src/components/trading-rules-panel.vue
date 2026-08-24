<script lang="ts" setup>
import type { TradingRulesDocument } from '#/lib/trading-rules';

import { Alert, Tag } from 'ant-design-vue';

import { formatTradingDate } from '#/lib/trading';

defineProps<{ document: TradingRulesDocument }>();
</script>

<template>
  <section class="rules-panel">
    <Alert message="每笔交易前必读" type="warning" show-icon />
    <header class="rules-heading">
      <div>
        <div class="page-kicker">TRADING DISCIPLINE / MUST FOLLOW</div>
        <h2>{{ document.title }}</h2>
      </div>
      <div class="page-actions">
        <Tag v-if="document.updatedAt">最后更新 {{ formatTradingDate(document.updatedAt) }}</Tag>
        <Tag color="green">{{ document.rules.length }} 条规则</Tag>
      </div>
    </header>
    <ol class="rules-grid">
      <li v-for="(rule, index) in document.rules" :key="rule.title">
        <span>{{ String(index + 1).padStart(2, '0') }}</span>
        <div>
          <h3>{{ rule.title }}</h3>
          <p v-if="rule.description">{{ rule.description }}</p>
        </div>
      </li>
    </ol>
  </section>
</template>
