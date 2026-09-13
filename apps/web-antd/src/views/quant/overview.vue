<script lang="ts" setup>
import { Card } from 'ant-design-vue';

import PageFrame from '#/components/page-frame.vue';
</script>

<template>
  <PageFrame title="Quant 总览" subtitle="量化交易研究与策略执行入口。">
    <Card class="terminal-panel" :bordered="false">
      <div class="page-kicker">QUANT OVERVIEW</div>
      <h2>Quant 总览</h2>
      <p class="muted">量化总览功能建设中，后续将接入策略表现、资金曲线和风险指标。</p>
    </Card>
  </PageFrame>
</template>
