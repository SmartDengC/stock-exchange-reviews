<script setup lang="ts">
import { tradingRules } from "~/lib/trading-rules";

useSeoMeta({
  title: "交易规则 · 市场日记",
  description: "Boss 交易规则，每笔交易前必读。",
});
</script>

<template>
  <AppShell module="research" title="交易规则" subtitle="每笔交易前必读">
    <section class="research-rules-page panel">
      <TradingRulesPanel :document="tradingRules" />
    </section>
  </AppShell>
</template>
