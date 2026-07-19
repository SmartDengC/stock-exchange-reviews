import Link from "next/link";
import { MarkdownDocument } from "../../../components/markdown-document";
import { getReview, reviews } from "../../../lib/reviews";

export function generateStaticParams() {
  return reviews.map((review) => ({ kind: review.kind, slug: review.slug }));
}

export default async function ReportPage({ params }: { params: Promise<{ kind: "daily" | "weekly"; slug: string }> }) {
  const { kind, slug } = await params;
  const review = getReview(kind, slug);
  if (!review) return <main className="empty-state"><h1>未找到这份复盘</h1><Link href="/">返回研究终端</Link></main>;
  return <main className="report-page"><header className="report-topbar"><Link href="/" className="brand"><span className="brand-mark">M</span><span>市场日记<small>MARKET DIARY</small></span></Link><Link href="/#archives" className="source-link">返回归档 <span>←</span></Link></header><section className="report-hero"><span className="eyebrow">{review.kind === "weekly" ? "WEEKLY REVIEW" : "DAILY REVIEW"} / {review.slug}</span><h1>{review.title}</h1><p>{review.dateLabel}</p></section><MarkdownDocument markdown={review.raw} /><footer>本系统仅用于个人研究与历史复盘，不构成任何投资建议。</footer></main>;
}
