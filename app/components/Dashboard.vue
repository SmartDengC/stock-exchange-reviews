<script setup lang="ts">
import {
  changeTone,
  dailyReviews,
  findRow,
  firstTable,
  section,
  stripMarkdown,
  tableForHeading,
  weeklyReviews,
  type ReviewRecord,
} from "~/lib/reviews";
import { tradingRules } from "~/lib/trading-rules";

type Asset = {
  label: string;
  market: string;
  value: string;
  change: string;
  tone: string;
  values: string[];
};

const props = defineProps<{ review: ReviewRecord }>();
const selectedReview = ref<ReviewRecord | null>(null);

function openReview(review: ReviewRecord) {
  selectedReview.value = review;
}

function assetFrom(table: ReturnType<typeof firstTable>, name: string, label: string, market: string): Asset {
  const row = findRow(table, name);
  const current = row?.at(-2) ?? "—";
  const change = row?.at(-1) ?? "—";
  return {
    label,
    market,
    value: current,
    change,
    tone: changeTone(change),
    values: row?.slice(1, -1).filter((value) => value !== "—") ?? [],
  };
}

const aTable = computed(() => firstTable(props.review.raw, "A股"));
const hkTable = computed(() => firstTable(props.review.raw, "港股"));
const goldTable = computed(() => firstTable(props.review.raw, "黄金"));
const oilTable = computed(() => firstTable(props.review.raw, "布伦特"));

const assets = computed<Asset[]>(() => [
  assetFrom(aTable.value, "上证", "上证指数", "A 股"),
  assetFrom(hkTable.value, "恒生指数", "恒生指数", "港 股"),
  assetFrom(goldTable.value, "现货黄金", "现货黄金", "贵金属"),
  oilTable.value?.rows[0]
    ? {
        label: "布伦特原油",
        market: "大宗商品",
        value: oilTable.value.rows[0][1] ?? "—",
        change: oilTable.value.rows[0][2] ?? "—",
        tone: changeTone(oilTable.value.rows[0][2]),
        values: oilTable.value.rows[0].slice(0, 2),
      }
    : { label: "布伦特原油", market: "大宗商品", value: "—", change: "—", tone: "neutral", values: [] },
]);

const strongest = computed(() => tableForHeading(props.review.raw, "周度最强"));
const weakest = computed(() => tableForHeading(props.review.raw, "周度最惨"));
const timeline = computed(() => firstTable(props.review.raw, "关键宏观事件时间线"));
const scenarios = computed(() => firstTable(props.review.raw, "情景推演"));
const summary = computed(() => section(props.review.raw, "一句话周总结").match(/>\s*(.+)/)?.[1] ?? "本周市场复盘已归档。");

const driverCards = [
  { step: "01", tag: "外部冲击", title: "能源冲击抬升风险溢价", text: "地缘局势通过油价、通胀预期与利率路径传导，压制全球风险资产。", tone: "negative" },
  { step: "02", tag: "关键分水岭", title: "通胀数据短暂改善预期", text: "CPI、PPI 回落一度缓和紧缩担忧，但未能改变周内风险偏好转弱的方向。", tone: "neutral" },
  { step: "03", tag: "国内放大器", title: "科技流动性承压", text: "大额 IPO、杠杆出清与业绩窗口共同放大了高估值科技板块的调整。", tone: "negative" },
  { step: "04", tag: "市场结果", title: "资金转向防御与现金流", text: "高波动成长板块承压，电力、银行和油气等防御方向获得相对支撑。", tone: "positive" },
];
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <div class="site-brand">市场日记 · 个人研究资料库</div>
        <h1>周度研究终端</h1>
        <p class="meta-line">最新资料 {{ review.slug }} · {{ review.dateLabel }}</p>
      </div>
      <div class="topbar-actions">
         <ThemeToggle />
         <a class="github-link" href="https://github.com/SmartDengC/stock-exchange-reviews" target="_blank" rel="noopener noreferrer" aria-label="GitHub 仓库">
           <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
             <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.05-.015-2.055-3.33.72-4.035-1.605-4.035-1.605-.54-1.38-1.32-1.755-1.32-1.755-1.08-.75.09-.735.09-.735 1.2.075 1.83 1.23 1.83 1.23 1.065 1.815 2.805 1.29 3.495.99.105-.78.42-1.29.765-1.59-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405 1.02 0 2.04.135 3 .405 2.28-1.56 3.285-1.23 3.285-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
           </svg>
         </a>
         <NuxtLink class="secondary-link" to="/trading">交易复盘 🔒</NuxtLink>
         <button type="button" class="primary-link overlay-trigger" @click="openReview(review)">阅读完整周报 ↗</button>
       </div>
    </header>

    <section class="dashboard-grid">
      <aside class="archive-rail" aria-label="复盘资料导航">
        <div id="archives" class="archive-list">
          <p class="rail-label">周度回顾</p>
          <button
            v-for="item in weeklyReviews"
            :key="item.slug"
            type="button"
            :class="{ active: selectedReview ? selectedReview.kind === item.kind && selectedReview.slug === item.slug : item.slug === review.slug }"
            @click="openReview(item)"
          >
            <span>{{ item.slug }}</span><b>{{ item.title.replace(/^\d{4}年第\d+周\s*/, "") }}</b>
          </button>

          <p class="rail-label daily-label">日度复盘</p>
          <button
            v-for="item in dailyReviews"
            :key="item.slug"
            type="button"
            :class="{ active: selectedReview?.kind === item.kind && selectedReview.slug === item.slug }"
            @click="openReview(item)"
          >
            <span>{{ item.slug }}</span><b>{{ item.title.replace(/^\d{4}年/, "") }}</b>
          </button>
        </div>
      </aside>

      <section class="main-stage">
        <section id="overview" class="summary-grid" aria-label="最新市场摘要">
          <article class="summary-item">
            <span>最新周报</span><strong>{{ review.slug }}</strong><small>{{ review.dateLabel }}</small>
          </article>
          <article class="summary-item">
            <span>市场温度</span><strong class="tone-negative">18 / 100</strong><small>极度风险规避</small>
          </article>
          <article class="summary-item">
            <span>当前策略</span><strong>防御模式</strong><small>现金流与低波动优先</small>
          </article>
        </section>

        <section class="content-section" aria-label="跨市场表现">
          <PanelHeader eyebrow="CROSS-ASSET / WEEKLY" title="跨市场表现" />
          <div class="metrics-grid"><MetricCard v-for="asset in assets" :key="asset.label" :asset="asset" /></div>
        </section>

        <section id="rotation" class="panel rotation-panel">
          <PanelHeader eyebrow="ROTATION" title="板块强弱图谱">
            <ATag color="arcoblue" size="small">{{ review.slug }}</ATag>
          </PanelHeader>
          <div class="sector-columns">
            <div>
              <h3 class="tone-positive">相对强势</h3>
              <div v-for="row in strongest?.rows.slice(0, 6)" :key="row[0]" class="sector-row">
                <b>{{ row[0] }}</b><span>{{ row[1] }}</span><small>{{ row[2] }}</small>
              </div>
              <p v-if="!strongest" class="empty-copy">暂无结构化板块数据</p>
            </div>
            <div>
              <h3 class="tone-negative">持续承压</h3>
              <div v-for="row in weakest?.rows.slice(0, 6)" :key="row[0]" class="sector-row">
                <b>{{ row[0] }}</b><span>{{ row[1] }}</span><small>{{ row[2] }}</small>
              </div>
              <p v-if="!weakest" class="empty-copy">暂无结构化板块数据</p>
            </div>
          </div>
        </section>

        <section id="drivers" class="panel drivers-panel">
          <PanelHeader eyebrow="CAUSAL MAP" title="本周核心驱动框架">
            <ATag color="green" size="small">MACRO → LIQUIDITY → RISK</ATag>
          </PanelHeader>
          <div class="driver-grid">
            <article v-for="card in driverCards" :key="card.step" :class="`driver-card tone-${card.tone}`">
              <span class="driver-step">{{ card.step }}</span>
              <div><small>{{ card.tag }}</small><h3>{{ card.title }}</h3><p>{{ card.text }}</p></div>
            </article>
          </div>
          <button type="button" class="source-citation overlay-trigger" @click="openReview(review)">
            引用来源：{{ review.slug }}《本周核心驱动框架》 <span>阅读原文 ↗</span>
          </button>
        </section>

        <section id="outlook" class="panel outlook-panel">
          <PanelHeader eyebrow="FORWARD VIEW" title="下周情景推演" />
          <div class="scenario-grid">
            <article v-for="row in scenarios?.rows" :key="row[0]" :class="`scenario-card tone-${changeTone(row[0])}`">
              <span>{{ row[0] }}</span><b>{{ row[2] }}</b><p>{{ row[1] }}</p><small>{{ row[3] }}</small>
            </article>
            <p v-if="!scenarios" class="empty-copy">暂无情景数据</p>
          </div>
        </section>
      </section>

      <div class="right-rail">
        <aside class="insight-panel" aria-label="本周趋势与事件">
          <PanelHeader eyebrow="WEEKLY SIGNAL" title="本周观察" />
          <section class="temperature-box">
            <span>风险温度</span><strong>18<small>/100</small></strong>
            <div class="temperature-scale"><i class="active" /><i /><i /><i /><i /></div>
            <p>市场处于风险规避区间，防御资产相对占优。</p>
          </section>

          <section class="signal-summary">
            <span>核心判断</span>
            <p>{{ stripMarkdown(summary) }}</p>
          </section>

          <section class="timeline-section">
            <div class="subsection-head"><h3>关键事件时间线</h3><span>MACRO CLOCK</span></div>
            <ol v-if="timeline" class="timeline">
              <li v-for="row in timeline.rows.slice(0, 8)" :key="`${row[0]}-${row[1]}`">
                <time>{{ row[0] }}</time>
                <div><b>{{ row[1] }}</b><p :class="`tone-${changeTone(row[2])}`">{{ row[2] }}</p></div>
              </li>
            </ol>
            <p v-else class="empty-copy">暂无时间线数据</p>
          </section>

          <button type="button" class="insight-link overlay-trigger" @click="openReview(review)">查看全部研究记录 <span>→</span></button>
        </aside>

        <TradingRulesPanel :document="tradingRules" />
      </div>
    </section>

    <footer>本系统仅用于个人研究与历史复盘，不构成任何投资建议。<span>MARKET DIARY · BUILD-TIME RESEARCH SYSTEM</span></footer>
    <ReviewOverlay :review="selectedReview" @close="selectedReview = null" />
  </main>
</template>
