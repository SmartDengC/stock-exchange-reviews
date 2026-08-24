<script lang="ts" setup>
import PageFrame from '#/components/page-frame.vue';
import TradingRulesPanel from '#/components/trading-rules-panel.vue';
import { tradingRules } from '#/lib/trading-rules';
</script>

<template>
  <PageFrame title="交易规则" subtitle="把纪律放在观点之前，每笔交易前必读。">
    <section class="terminal-panel panel-body">
      <TradingRulesPanel :document="tradingRules" />
    </section>
  </PageFrame>
</template>
