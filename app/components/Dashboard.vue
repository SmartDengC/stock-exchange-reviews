<script setup lang="ts">
import {
  changeTone,
  dailyReviews,
  findRow,
  firstTable,
  reviewRoute,
  section,
  stripMarkdown,
  tableForHeading,
  weeklyReviews,
  type ReviewRecord,
} from "~/lib/reviews";

type Asset = {
  label: string;
  market: string;
  value: string;
  change: string;
  tone: string;
  values: string[];
};

const props = defineProps<{ review: ReviewRecord }>();

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
        <NuxtLink class="primary-link" :to="reviewRoute(review)">阅读完整周报 ↗</NuxtLink>
      </div>
    </header>

    <section class="dashboard-grid">
      <aside class="archive-rail" aria-label="复盘资料导航">
        <NuxtLink class="brand" to="/">
          <span class="brand-mark">M</span>
          <span>市场日记<small>MARKET DIARY</small></span>
        </NuxtLink>

        <nav class="section-nav" aria-label="页面章节">
          <a href="#overview"><span>01</span>市场概览</a>
          <a href="#rotation"><span>02</span>板块轮动</a>
          <a href="#drivers"><span>03</span>驱动框架</a>
          <a href="#outlook"><span>04</span>情景推演</a>
        </nav>

        <div class="archive-list" id="archives">
          <p class="rail-label">周度回顾</p>
          <NuxtLink
            v-for="item in weeklyReviews"
            :key="item.slug"
            :to="reviewRoute(item)"
            :class="{ active: item.slug === review.slug }"
          >
            <span>{{ item.slug }}</span><b>{{ item.title.replace(/^\d{4}年第\d+周\s*/, "") }}</b>
          </NuxtLink>

          <p class="rail-label daily-label">日度复盘</p>
          <NuxtLink v-for="item in dailyReviews" :key="item.slug" :to="reviewRoute(item)">
            <span>{{ item.slug }}</span><b>{{ item.title.replace(/^\d{4}年/, "") }}</b>
          </NuxtLink>
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

        <article class="conclusion-card">
          <div class="conclusion-label"><i /> 本周结论</div>
          <p>{{ stripMarkdown(summary) }}</p>
          <div class="conclusion-meta"><span>数据来自本地资料库</span><span>构建时同步</span></div>
        </article>

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
          <NuxtLink class="source-citation" :to="reviewRoute(review)">
            引用来源：{{ review.slug }}《本周核心驱动框架》 <span>阅读原文 ↗</span>
          </NuxtLink>
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

        <NuxtLink class="insight-link" :to="reviewRoute(review)">查看全部研究记录 <span>→</span></NuxtLink>
      </aside>
    </section>

    <footer>本系统仅用于个人研究与历史复盘，不构成任何投资建议。<span>MARKET DIARY · BUILD-TIME RESEARCH SYSTEM</span></footer>
  </main>
</template>
