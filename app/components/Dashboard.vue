<script setup lang="ts">
import {
  changeTone,
  findRow,
  firstTable,
  tableForHeading,
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

const driverCards = [
  { step: "01", tag: "外部冲击", title: "能源冲击抬升风险溢价", text: "地缘局势通过油价、通胀预期与利率路径传导，压制全球风险资产。", tone: "negative" },
  { step: "02", tag: "关键分水岭", title: "通胀数据短暂改善预期", text: "CPI、PPI 回落一度缓和紧缩担忧，但未能改变周内风险偏好转弱的方向。", tone: "neutral" },
  { step: "03", tag: "国内放大器", title: "科技流动性承压", text: "大额 IPO、杠杆出清与业绩窗口共同放大了高估值科技板块的调整。", tone: "negative" },
  { step: "04", tag: "市场结果", title: "资金转向防御与现金流", text: "高波动成长板块承压，电力、银行和油气等防御方向获得相对支撑。", tone: "positive" },
];
</script>

<template>
  <AppShell module="research" title="周度研究终端" :subtitle="`最新资料 ${review.slug} · ${review.dateLabel}`">
    <section class="dashboard-grid">
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
      </section>
    </section>
    <ReviewOverlay :review="selectedReview" @close="selectedReview = null" />
  </AppShell>
</template>
