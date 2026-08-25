export type TradeMarket = "a_share" | "crypto";
export type TradeSide = "long" | "short";
export type TradeStatus = "closed" | "open";
export type PositionBasis = "notional" | "quantity";
export type SettlementCurrency = "CNY" | "USD" | "USDT";
export type ExecutionGrade = "A" | "B" | "C";
export type TradingOptionKind = "emotion" | "error_tag" | "instrument_code" | "strategy" | "symbol" | "timeframe";

export type TradeInput = {
  didWell?: null | string;
  emotion?: null | string;
  entryAt: string;
  entryPrice: string;
  entryReason: string;
  errorNotes?: null | string;
  errorTags?: string[];
  executionGrade?: ExecutionGrade | null;
  exitAt?: null | string;
  exitPrice?: null | string;
  exitReason?: null | string;
  fees?: null | string;
  fxToCny: string;
  instrumentCode?: null | string;
  market: TradeMarket;
  nextImprovement?: null | string;
  plannedRiskAmount?: null | string;
  positionBasis: PositionBasis;
  positionSize: string;
  settlementCurrency: SettlementCurrency;
  side: TradeSide;
  status: TradeStatus;
  strategy: string;
  symbol: string;
  timeframe: string;
  tradeDate: string;
  version?: number;
};

export type TradeAttachment = {
  contentType: string;
  createdAt: string;
  fileName: string;
  fileUrl: string;
  height: null | number;
  id: string;
  isCover: boolean;
  size: number;
  sortOrder: number;
  tradeId: string;
  width: null | number;
};

export type TradeView = TradeInput & {
  attachments: TradeAttachment[];
  createdAt: string;
  deletedAt: null | string;
  grossPnl: null | string;
  holdMinutes: null | number;
  id: string;
  isWinning: boolean | null;
  netPnl: null | string;
  pnlCny: null | string;
  rMultiple: null | string;
  updatedAt: string;
  version: number;
};

export type DailyReviewInput = {
  avoidedImpulseAdds?: boolean | null;
  avoidedRevengeTrading?: boolean | null;
  bestTradeId?: null | string;
  biggestMistake?: null | string;
  dailySummary?: null | string;
  exitedAsPlanned?: boolean | null;
  followedStops?: boolean | null;
  marketPlan?: null | string;
  notes?: null | string;
  plannedOnly?: boolean | null;
  priorityFix?: null | string;
  reviewDate: string;
  tomorrowOneThing?: null | string;
  version?: number;
};

export type DailyReviewView = DailyReviewInput & {
  createdAt: string;
  id: string;
  metrics: DashboardMetrics;
  screenshotComplete: boolean;
  trades: TradeView[];
  updatedAt: string;
  version: number;
};

export type DashboardMetrics = {
  averagePnlCny: null | string;
  closedTrades: number;
  gradeARate: null | number;
  netPnlCny: string;
  openTrades: number;
  profitFactor: null | string;
  totalR: null | string;
  winRate: null | number;
};

export type DashboardBreakdown = {
  count: number;
  label: string;
  pnlCny: string;
  winRate: null | number;
};

export type TradingDashboard = {
  byMarket: DashboardBreakdown[];
  byStrategy: DashboardBreakdown[];
  dailyPnl: Array<{ count: number; date: string; pnlCny: string; }>;
  emotionDistribution: Array<{ count: number; label: string; }>;
  errorTagDistribution: Array<{ count: number; label: string; }>;
  gradeDistribution: Array<{ count: number; label: string; }>;
  metrics: DashboardMetrics;
  openTrades: TradeView[];
  pendingDailyReviews: string[];
  recentTrades: TradeView[];
};

export type TradingOption = {
  active: boolean;
  id: string;
  kind: TradingOptionKind;
  label: string;
  sortOrder: number;
};

export type TradingRule = {
  active: boolean;
  createdAt: string;
  description: string;
  id: string;
  sortOrder: number;
  title: string;
  updatedAt: string;
  version: number;
};

export type TradingRuleInput = {
  active: boolean;
  description: string;
  sortOrder: number;
  title: string;
  version?: number;
};

export type TradingSettings = {
  defaultUsdtCnyRate: string;
};

export type TradingOptionsResponse = {
  options: TradingOption[];
  settings: TradingSettings;
};

export type TradeListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  trades: TradeView[];
};

export type TradeListFilters = {
  emotion?: string;
  errorTag?: string;
  from?: string;
  grade?: string;
  limit?: number;
  market?: string;
  outcome?: "loss" | "win";
  page?: number;
  pageSize?: number;
  query?: string;
  side?: string;
  status?: string;
  strategy?: string;
  timeframe?: string;
  to?: string;
};
