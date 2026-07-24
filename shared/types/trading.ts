export type TradeMarket = "crypto" | "a_share";
export type TradeSide = "long" | "short";
export type TradeStatus = "open" | "closed";
export type PositionBasis = "quantity" | "notional";
export type SettlementCurrency = "CNY" | "USDT" | "USD";
export type ExecutionGrade = "A" | "B" | "C";
export type TradingOptionKind = "strategy" | "timeframe" | "emotion" | "error_tag";

export type TradeInput = {
  status: TradeStatus;
  tradeDate: string;
  instrumentCode?: string | null;
  symbol: string;
  market: TradeMarket;
  side: TradeSide;
  strategy: string;
  timeframe: string;
  entryAt: string;
  exitAt?: string | null;
  entryReason: string;
  exitReason?: string | null;
  entryPrice: string;
  exitPrice?: string | null;
  positionSize: string;
  positionBasis: PositionBasis;
  settlementCurrency: SettlementCurrency;
  plannedRiskAmount?: string | null;
  fees?: string | null;
  fxToCny: string;
  executionGrade?: ExecutionGrade | null;
  emotion?: string | null;
  errorTags?: string[];
  errorNotes?: string | null;
  didWell?: string | null;
  nextImprovement?: string | null;
  updatedAt?: string;
};

export type TradeAttachment = {
  id: string;
  tradeId: string;
  fileName: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isCover: boolean;
  fileUrl: string;
  createdAt: string;
};

export type TradeView = TradeInput & {
  id: string;
  grossPnl: string | null;
  netPnl: string | null;
  pnlCny: string | null;
  rMultiple: string | null;
  holdMinutes: number | null;
  isWinning: boolean | null;
  attachments: TradeAttachment[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type DailyReviewInput = {
  reviewDate: string;
  marketPlan?: string | null;
  dailySummary?: string | null;
  bestTradeId?: string | null;
  biggestMistake?: string | null;
  tomorrowOneThing?: string | null;
  plannedOnly?: boolean | null;
  followedStops?: boolean | null;
  avoidedImpulseAdds?: boolean | null;
  avoidedRevengeTrading?: boolean | null;
  exitedAsPlanned?: boolean | null;
  priorityFix?: string | null;
  notes?: string | null;
  updatedAt?: string;
};

export type DailyReviewView = DailyReviewInput & {
  id: string;
  screenshotComplete: boolean;
  metrics: DashboardMetrics;
  trades: TradeView[];
  createdAt: string;
  updatedAt: string;
};

export type DashboardMetrics = {
  closedTrades: number;
  openTrades: number;
  netPnlCny: string;
  winRate: number | null;
  totalR: string | null;
  averagePnlCny: string | null;
  gradeARate: number | null;
  profitFactor: string | null;
};

export type DashboardBreakdown = {
  label: string;
  count: number;
  pnlCny: string;
  winRate: number | null;
};

export type TradingDashboard = {
  metrics: DashboardMetrics;
  dailyPnl: Array<{ date: string; pnlCny: string; count: number }>;
  byMarket: DashboardBreakdown[];
  byStrategy: DashboardBreakdown[];
  gradeDistribution: Array<{ label: string; count: number }>;
  emotionDistribution: Array<{ label: string; count: number }>;
  errorTagDistribution: Array<{ label: string; count: number }>;
  openTrades: TradeView[];
  recentTrades: TradeView[];
  pendingDailyReviews: string[];
};

export type TradingOption = {
  id: string;
  kind: TradingOptionKind;
  label: string;
  active: boolean;
  sortOrder: number;
};

export type TradingSettings = {
  defaultUsdtCnyRate: string;
};

export type TradingOptionsResponse = {
  options: TradingOption[];
  settings: TradingSettings;
};
