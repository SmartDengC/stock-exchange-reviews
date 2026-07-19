import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";
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
} from "../lib/reviews";

type Asset = { label: string; market: string; value: string; change: string; tone: string; values: string[] };

function numeric(value: string) {
  const number = Number.parseFloat(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function SparkBars({ values }: { values: string[] }) {
  const numbers = values.map(numeric).filter((value) => value > 0);
  if (!numbers.length) return <span className="spark-empty">数据待补充</span>;
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = max - min || 1;
  return <div className="spark-bars" aria-label={`本周走势：${values.join("、")}`}>{numbers.map((value, index) => <i key={index} style={{ height: `${24 + ((value - min) / range) * 76}%` }} />)}</div>;
}

function assetFrom(table: ReturnType<typeof firstTable>, name: string, label: string, market: string): Asset {
  const row = findRow(table, name);
  const current = row?.at(-2) ?? "—";
  const change = row?.at(-1) ?? "—";
  return { label, market, value: current, change, tone: changeTone(change), values: row?.slice(1, -1).filter((value) => value !== "—") ?? [] };
}

function MetricCard({ asset }: { asset: Asset }) {
  return <article className="metric-card">
    <div className="metric-top"><span>{asset.market}</span><b className={`tone-${asset.tone}`}>{asset.change}</b></div>
    <div className="metric-value">{asset.value}</div>
    <div className="metric-bottom"><strong>{asset.label}</strong><SparkBars values={asset.values} /></div>
  </article>;
}

function PanelTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <div className="panel-title"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action}</div>;
}

export function Dashboard({ review }: { review: ReviewRecord | null }) {
  if (!review) return <main className="empty-state"><p className="eyebrow">MARKET DIARY</p><h1>尚未发现市场复盘</h1><p>请将日报放入 reviews/，或将周报放入 reviews/weekly/。</p></main>;

  const aTable = firstTable(review.raw, "A股");
  const hkTable = firstTable(review.raw, "港股");
  const goldTable = firstTable(review.raw, "黄金");
  const oilTable = firstTable(review.raw, "布伦特");
  const assets = [
    assetFrom(aTable, "上证", "上证指数", "A 股"),
    assetFrom(hkTable, "恒生指数", "恒生指数", "港 股"),
    assetFrom(goldTable, "现货黄金", "现货黄金", "贵金属"),
    oilTable?.rows[0] ? { label: "布伦特原油", market: "大宗商品", value: oilTable.rows[0][1] ?? "—", change: oilTable.rows[0][2] ?? "—", tone: changeTone(oilTable.rows[0][2]), values: oilTable.rows[0].slice(0, 2) } : { label: "布伦特原油", market: "大宗商品", value: "—", change: "—", tone: "neutral", values: [] },
  ];
  const strongest = tableForHeading(review.raw, "周度最强");
  const weakest = tableForHeading(review.raw, "周度最惨");
  const timeline = firstTable(review.raw, "关键宏观事件时间线");
  const scenarios = firstTable(review.raw, "情景推演");
  const summary = section(review.raw, "一句话周总结").match(/>\s*(.+)/)?.[1] ?? "本周市场复盘已归档。";
  const driverCards = [
    { step: "01", tag: "外部冲击", title: "能源冲击抬升风险溢价", text: "地缘局势通过油价、通胀预期与利率路径传导，压制全球风险资产。", tone: "negative" },
    { step: "02", tag: "关键分水岭", title: "通胀数据短暂改善预期", text: "CPI、PPI回落一度缓和紧缩担忧，但未能改变周内风险偏好转弱的方向。", tone: "neutral" },
    { step: "03", tag: "国内放大器", title: "科技流动性承压", text: "大额IPO、杠杆出清与业绩窗口共同放大了高估值科技板块的调整。", tone: "negative" },
    { step: "04", tag: "市场结果", title: "资金转向防御与现金流", text: "高波动成长板块承压，电力、银行和油气等防御方向获得相对支撑。", tone: "positive" },
  ];

  return <main className="terminal-shell">
    <aside className="side-rail" aria-label="主要导航">
      <Link className="brand" href="/"><span className="brand-mark">M</span><span>市场日记<small>MARKET DIARY</small></span></Link>
      <nav>
        <a className="nav-item active" href="#dashboard"><span>01</span>周度驾驶舱</a>
        <a className="nav-item" href="#drivers"><span>02</span>驱动框架</a>
        <a className="nav-item" href="#outlook"><span>03</span>下周情景</a>
        <a className="nav-item" href="#archives"><span>04</span>复盘归档</a>
      </nav>
      <div className="rail-bottom"><span className="live-dot" />资料库已同步<br /><small>BUILD-TIME INDEX</small></div>
    </aside>

    <section id="dashboard" className="workspace">
      <header className="topbar"><div><span className="eyebrow">WEEKLY INTELLIGENCE / {review.slug}</span><h1>风险偏好已切换至 <em>防御模式</em></h1></div><div className="topbar-actions"><ThemeToggle /><Link className="source-link" href={`/report/weekly/${review.slug}`}>阅读完整周报 <span>↗</span></Link></div></header>

      <section className="hero-grid">
        <article className="thesis-card">
          <span className="thesis-label"><i /> 本周结论</span>
          <p>{stripMarkdown(summary)}</p>
          <div className="thesis-meta"><span>{review.dateLabel}</span><span>更新于本地资料库</span></div>
        </article>
        <article className="temperature-card"><span className="eyebrow">MARKET TEMPERATURE</span><div className="temperature-number">18<small>/100</small></div><div className="temperature-scale"><i /><i /><i /><i /><i /></div><p>极度风险规避</p></article>
      </section>

      <section aria-label="跨市场表现"><PanelTitle eyebrow="CROSS-ASSET / WEEKLY" title="跨市场表现" /><div className="metrics-grid">{assets.map((asset) => <MetricCard key={asset.label} asset={asset} />)}</div></section>

      <section className="analysis-grid">
        <article className="panel sectors-panel"><PanelTitle eyebrow="ROTATION" title="板块强弱图谱" /><div className="sector-columns"><div><h3 className="positive-heading">相对强势</h3>{strongest?.rows.slice(0, 6).map((row) => <div className="sector-row" key={row[0]}><b>{row[0]}</b><span>{row[1]}</span><small>{row[2]}</small></div>) ?? <p>暂无结构化板块数据</p>}</div><div><h3 className="negative-heading">持续承压</h3>{weakest?.rows.slice(0, 6).map((row) => <div className="sector-row" key={row[0]}><b>{row[0]}</b><span>{row[1]}</span><small>{row[2]}</small></div>) ?? <p>暂无结构化板块数据</p>}</div></div></article>
        <article className="panel timeline-panel"><PanelTitle eyebrow="MACRO CLOCK" title="关键事件时间线" />{timeline ? <ol className="timeline">{timeline.rows.slice(0, 8).map((row) => <li key={`${row[0]}-${row[1]}`}><time>{row[0]}</time><div><b>{row[1]}</b><p className={`tone-${changeTone(row[2])}`}>{row[2]}</p></div></li>)}</ol> : <p>暂无时间线数据</p>}</article>
      </section>

      <section id="drivers" className="drivers-panel"><PanelTitle eyebrow="CAUSAL MAP" title="本周核心驱动框架" action={<span className="data-chip">MACRO → LIQUIDITY → RISK</span>} /><p className="drivers-intro">将本周叙事压缩为可快速判断的传导链；具体数据与事件保留在原始周报中。</p><div className="driver-summary-grid">{driverCards.map((card, index) => <article className={`driver-summary-card tone-${card.tone}`} key={card.step}><span className="driver-step">{card.step}</span><div><span className="driver-tag">{card.tag}</span><h3>{card.title}</h3><p>{card.text}</p></div>{index < driverCards.length - 1 && <i className="driver-arrow">→</i>}</article>)}</div><Link className="source-citation" href={`/report/weekly/${review.slug}`}>引用来源：{review.slug}《本周核心驱动框架》 <span>阅读原文 ↗</span></Link></section>

      <section id="outlook" className="outlook-panel"><PanelTitle eyebrow="FORWARD VIEW" title="下周情景推演" /><div className="scenario-grid">{scenarios?.rows.map((row) => <article className={`scenario-card tone-${changeTone(row[0])}`} key={row[0]}><span>{row[0]}</span><b>{row[2]}</b><p>{row[1]}</p><small>{row[3]}</small></article>) ?? <p>暂无情景数据</p>}</div></section>

      <section id="archives" className="archive-panel"><PanelTitle eyebrow="ARCHIVE" title="复盘归档" /><ArchiveLinks /></section>
      <footer>本系统仅用于个人研究与历史复盘，不构成任何投资建议。<span>市场日记 · BUILD-TIME RESEARCH SYSTEM</span></footer>
    </section>
  </main>;
}

function ArchiveLinks() {
  return <div className="archive-columns"><div><h3>周度回顾</h3>{weeklyReviews.map((item) => <Link href={`/report/weekly/${item.slug}`} key={item.slug}><span>{item.slug}</span><b>{item.title.replace(/^\d{4}年第\d+周\s*/, "")}</b><i>→</i></Link>)}</div><div><h3>日度复盘</h3>{dailyReviews.map((item) => <Link href={`/report/daily/${item.slug}`} key={item.slug}><span>{item.slug}</span><b>{item.title.replace(/^\d{4}年/, "")}</b><i>→</i></Link>)}</div></div>;
}
