<script setup lang="ts">
import type { TradingRulesDocument } from "~/lib/trading-rules";

defineProps<{ document: TradingRulesDocument }>();

function ruleNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}
</script>

<template>
  <section class="trading-rules-panel" aria-labelledby="trading-rules-title">
    <header class="trading-rules-heading">
      <div>
        <p class="trading-rules-eyebrow">TRADING DISCIPLINE / MUST FOLLOW</p>
        <h2 id="trading-rules-title">{{ document.title }}</h2>
        <p class="trading-rules-updated">
          <span v-if="document.updatedAt">最后更新：{{ document.updatedAt }}</span>
          <span>共 {{ document.rules.length }} 条</span>
        </p>
      </div>
      <strong class="trading-rules-required">
        <span aria-hidden="true">!</span>
        每笔交易前必读
      </strong>
    </header>

    <ol class="trading-rules-grid">
      <li v-for="(rule, index) in document.rules" :key="rule.title" class="trading-rule">
        <span class="trading-rule-number" aria-hidden="true">{{ ruleNumber(index) }}</span>
        <div>
          <h3>{{ rule.title }}</h3>
          <p v-if="rule.description">{{ rule.description }}</p>
        </div>
      </li>
    </ol>
  </section>
</template>
