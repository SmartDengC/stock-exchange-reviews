<script lang="ts" setup>
import { Alert, Card, Tag } from 'ant-design-vue';

import { quantResearchStrategies } from '#/data/quant-research-strategies';
import PageFrame from '#/components/page-frame.vue';

const verifiedAt = quantResearchStrategies[0]?.verifiedAt ?? '2026-09-14';
</script>

<template>
  <PageFrame
    kicker="QUANT RESEARCH"
    title="研究精选 10 类"
    subtitle="面向加密资产的策略方法目录，帮助建立可复核的研究假设。"
  >
    <div class="quant-overview">
      <Alert
        class="quant-notice"
        message="这不是全市场胜率排行榜"
        description="不同市场、周期、手续费、滑点和回测区间会产生不同结果。本页展示公开研究中值得复核的策略方向，不填写未经统一口径验证的胜率。"
        show-icon
        type="warning"
      />

      <div class="quant-overview-stats">
        <Card class="terminal-panel quant-stat" :bordered="false">
          <span class="page-kicker">CURATED SET</span>
          <strong>10</strong>
          <span>类研究策略</span>
        </Card>
        <Card class="terminal-panel quant-stat" :bordered="false">
          <span class="page-kicker">MARKET</span>
          <strong>CRYPTO</strong>
          <span>加密资产市场</span>
        </Card>
        <Card class="terminal-panel quant-stat" :bordered="false">
          <span class="page-kicker">VERIFIED</span>
          <strong>{{ verifiedAt }}</strong>
          <span>资料核验日期</span>
        </Card>
      </div>

      <section class="terminal-panel quant-research-panel">
        <div class="quant-panel-heading">
          <div>
            <div class="page-kicker">RESEARCH DIGEST</div>
            <h2>十类策略方向</h2>
          </div>
          <span class="muted">点击卡片展开说明</span>
        </div>

        <div class="quant-research-list">
          <article
            v-for="item in quantResearchStrategies"
            :key="item.id"
            class="quant-research-card"
            data-testid="quant-research-card"
          >
            <details :open="item.rank === 1">
              <summary class="quant-research-summary">
                <span class="quant-rank">{{ String(item.rank).padStart(2, '0') }}</span>
                <span class="quant-research-name">
                  <strong>{{ item.name }}</strong>
                  <small>{{ item.englishName }}</small>
                </span>
                <Tag color="green">{{ item.family }}</Tag>
                <span class="quant-chevron" aria-hidden="true">⌄</span>
              </summary>

              <div class="quant-research-body">
                <div class="quant-research-copy">
                  <div>
                    <span class="quant-field-label">策略原理</span>
                    <p>{{ item.principle }}</p>
                  </div>
                  <div>
                    <span class="quant-field-label">典型信号</span>
                    <p>{{ item.signal }}</p>
                  </div>
                  <div>
                    <span class="quant-field-label">适用范围</span>
                    <p>{{ item.market }}</p>
                  </div>
                  <div>
                    <span class="quant-field-label">主要风险</span>
                    <p>{{ item.risk }}</p>
                  </div>
                </div>

                <div class="quant-research-meta">
                  <div>
                    <span class="quant-field-label">与现有策略库的衔接</span>
                    <p>{{ item.integration }}</p>
                  </div>
                  <div class="quant-sources">
                    <span class="quant-field-label">研究来源</span>
                    <a
                      v-for="source in item.sources"
                      :key="source.url"
                      :href="source.url"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {{ source.label }} ↗
                    </a>
                  </div>
                </div>
              </div>
            </details>
          </article>
        </div>
      </section>

      <p class="quant-research-footnote">
        研究提示：Freqtrade 回测会使用完整时间范围计算数据，未来数据、手续费和成交假设都可能显著扭曲结果。实际接入前应进行样本外回测、lookahead-analysis、recursive-analysis 和 dry run 验证。
      </p>
    </div>
  </PageFrame>
</template>

<style scoped>
.quant-overview {
  display: grid;
  gap: 1rem;
}

.quant-notice {
  border: 1px solid color-mix(in srgb, var(--md-accent), transparent 65%);
  border-radius: 0.85rem;
}

.quant-overview-stats {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.quant-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 1.1rem;
}

.quant-stat strong {
  color: var(--md-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(1.35rem, 2.5vw, 2rem);
  letter-spacing: -0.04em;
}

.quant-stat > span:last-child {
  color: var(--md-muted);
  font-size: 0.82rem;
}

.quant-research-panel {
  padding: 1.25rem;
}

.quant-panel-heading {
  align-items: flex-end;
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.quant-panel-heading h2 {
  color: var(--md-text);
  font-size: 1.35rem;
  margin: 0.35rem 0 0;
}

.quant-research-list {
  display: grid;
  gap: 0.65rem;
}

.quant-research-card {
  border: 1px solid var(--md-border);
  border-radius: 0.7rem;
  overflow: hidden;
}

.quant-research-card details[open] {
  background: color-mix(in srgb, var(--md-accent-soft), transparent 34%);
}

.quant-research-summary {
  align-items: center;
  cursor: pointer;
  display: grid;
  gap: 0.8rem;
  grid-template-columns: 2rem minmax(12rem, 1.4fr) auto 1rem;
  list-style: none;
  padding: 0.9rem 1rem;
}

.quant-research-summary::-webkit-details-marker {
  display: none;
}

.quant-rank {
  color: var(--md-accent);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 700;
}

.quant-research-name {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.quant-research-name strong {
  color: var(--md-text);
  font-size: 1rem;
}

.quant-research-name small {
  color: var(--md-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
}

.quant-chevron {
  color: var(--md-muted);
  font-size: 1.2rem;
  transition: transform 180ms ease;
}

.quant-research-card details[open] .quant-chevron {
  transform: rotate(180deg);
}

.quant-research-body {
  border-top: 1px solid var(--md-border);
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1.25fr) minmax(16rem, 0.75fr);
  padding: 1rem 1rem 1.1rem 3.8rem;
}

.quant-research-copy {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.quant-field-label {
  color: var(--md-accent);
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 0.28rem;
}

.quant-research-body p {
  color: var(--md-muted);
  font-size: 0.86rem;
  line-height: 1.65;
  margin: 0;
}

.quant-research-meta {
  border-left: 1px solid var(--md-border);
  display: grid;
  gap: 0.9rem;
  padding-left: 1rem;
}

.quant-sources {
  display: grid;
  gap: 0.35rem;
}

.quant-sources a {
  color: var(--md-positive);
  font-size: 0.8rem;
  line-height: 1.45;
  text-decoration: none;
}

.quant-sources a:hover {
  text-decoration: underline;
}

.quant-research-footnote {
  color: var(--md-muted);
  font-size: 0.8rem;
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 800px) {
  .quant-overview-stats,
  .quant-research-body,
  .quant-research-copy {
    grid-template-columns: 1fr;
  }

  .quant-research-meta {
    border-left: 0;
    border-top: 1px solid var(--md-border);
    padding-left: 0;
    padding-top: 1rem;
  }

  .quant-research-summary {
    grid-template-columns: 2rem minmax(0, 1fr) auto 1rem;
  }

  .quant-research-body {
    padding-left: 1rem;
  }
}
</style>
