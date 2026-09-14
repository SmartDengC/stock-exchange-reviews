export type QuantResearchSource = {
  label: string;
  url: string;
};

export type QuantResearchStrategy = {
  englishName: string;
  family: string;
  id: string;
  integration: string;
  market: string;
  name: string;
  principle: string;
  rank: number;
  risk: string;
  signal: string;
  sources: QuantResearchSource[];
  verifiedAt: string;
};

export const quantResearchStrategies: QuantResearchStrategy[] = [
  {
    englishName: 'Time-Series Momentum',
    family: '趋势跟随',
    id: 'time-series-momentum',
    integration: '可用现有 5m Freqtrade 策略实现简化版，但日线或小时级趋势过滤更适合研究结论。',
    market: '流动性较好的主流币；单币种多空或只做多。',
    name: '时间序列动量',
    principle: '判断单个币种过去一段时间的方向和强度，趋势成立时顺势持有，趋势反转时退出。',
    rank: 1,
    risk: '震荡行情会产生连续假突破；高杠杆和快速反转会放大回撤。',
    signal: '移动均线方向、突破前高或前低、收益率为正且波动率不过高。',
    sources: [
      {
        label: 'SSRN · Momentum in the Cryptocurrency Market',
        url: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4675565',
      },
    ],
    verifiedAt: '2026-09-14',
  },
  {
    englishName: 'Cross-Sectional Momentum',
    family: '横截面轮动',
    id: 'cross-sectional-momentum',
    integration: '可以接入 Freqtrade 的动态交易对筛选；需要防止幸存者偏差和换仓滑点。',
    market: '一组流动性和上市时间合格的币种。',
    name: '横截面动量轮动',
    principle: '在同一时点比较多个币种的近期表现，买入相对强势资产，定期淘汰相对弱势资产。',
    rank: 2,
    risk: '研究结论受样本、换仓频率和动态币池影响明显；暴跌时强势币也可能同步下跌。',
    signal: '按 7 至 30 日收益、波动率调整收益或成交量过滤进行排序，定期等权或风险加权。',
    sources: [
      {
        label: 'SSRN · Cross-sectional Momentum in Cryptocurrency Markets',
        url: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4322637',
      },
      {
        label: 'SSRN · Momentum under Realistic Assumptions',
        url: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4675565',
      },
    ],
    verifiedAt: '2026-09-14',
  },
  {
    englishName: 'Short-Horizon Mean Reversion',
    family: '均值回归',
    id: 'short-horizon-mean-reversion',
    integration: '可用 5m K 线研究，但必须用成交成本、盘口价差和严格的样本外区间复核。',
    market: '高流动性现货或低杠杆永续合约。',
    name: '短周期均值回归',
    principle: '价格在短时间内偏离近期均衡后，利用反向交易捕捉回归；持仓通常较短。',
    rank: 3,
    risk: '趋势行情中的逆势交易容易快速止损；交易频率高，手续费和滑点可能吞噬优势。',
    signal: '标准化收益偏离、布林带位置、短周期波动冲击和成交量确认共同触发。',
    sources: [
      {
        label: 'arXiv · Short-horizon mean reversion in cryptocurrency markets',
        url: 'https://arxiv.org/abs/2608.21888',
      },
    ],
    verifiedAt: '2026-09-14',
  },
  {
    englishName: 'Crypto Reversal',
    family: '反转策略',
    id: 'crypto-reversal',
    integration: '可转化为定期轮动策略；需要单独维护动态币池和持有期，不宜直接套用 5m 参数。',
    market: '分散化的多币种组合，适合周频至月频研究。',
    name: '中长期反转',
    principle: '利用较长观察窗口内的过度上涨或下跌，买入相对落后资产并等待价格关系修复。',
    rank: 4,
    risk: '下跌资产可能继续下跌；流动性、退市和极端事件会使历史反转关系失效。',
    signal: '按较长周期累计收益分组，做多落后组或构建多空价差，并控制单币种权重。',
    sources: [
      {
        label: 'SSRN · Cryptocurrency Momentum and Reversal',
        url: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3913263',
      },
    ],
    verifiedAt: '2026-09-14',
  },
  {
    englishName: 'Cointegration Pairs Trading',
    family: '统计套利',
    id: 'cointegration-pairs-trading',
    integration: '现有单币种 Freqtrade 策略不能完整表达配对仓位，需要组合级执行和同时下单能力。',
    market: '具有稳定经济关系或高相关性的币种对。',
    name: '协整配对交易',
    principle: '寻找长期稳定的价格关系，交易价差偏离后的回归，而不是直接押注单个币种涨跌。',
    rank: 5,
    risk: '协整关系会变化；两腿成交不同步、借贷成本和资金费率会造成额外损失。',
    signal: '滚动协整检验、价差 Z-Score 和均值回归半衰期共同决定建仓与平仓。',
    sources: [
      {
        label: 'arXiv · Dynamic Cointegration-Based Pairs Trading',
        url: 'https://arxiv.org/abs/2109.10662',
      },
    ],
    verifiedAt: '2026-09-14',
  },
  {
    englishName: 'Dynamic Grid Trading',
    family: '区间交易',
    id: 'dynamic-grid-trading',
    integration: '可作为 Freqtrade 的区间挂单研究方向，但当前策略库不负责网格订单编排和动态重置。',
    market: '有明确区间、流动性充足且波动可控的现货或低杠杆市场。',
    name: '动态网格',
    principle: '在价格区间内分层挂买卖单，并根据波动和价格中枢变化调整网格，尝试从往返波动中获利。',
    rank: 6,
    risk: '单边行情会积累亏损仓位；网格间距、库存和手续费决定策略能否覆盖成本。',
    signal: '用波动率和趋势状态估计区间，在突破、波动扩张或库存超限时重置网格。',
    sources: [
      {
        label: 'arXiv · Dynamic Grid Trading Strategy',
        url: 'https://arxiv.org/abs/2506.11921',
      },
    ],
    verifiedAt: '2026-09-14',
  },
  {
    englishName: 'Funding-Rate Carry',
    family: '衍生品套利',
    id: 'funding-rate-carry',
    integration: '需要现货与永续合约双腿、保证金和资金费率数据，不能由单一 5m K 线策略完整实现。',
    market: '主流币永续合约与对应现货市场。',
    name: '资金费率策略',
    principle: '通过现货和永续合约对冲方向敞口，持有资金费率相对有利的一侧，赚取费率或价差。',
    rank: 7,
    risk: '资金费率会迅速反转；爆仓、保证金占用、交易所信用和跨腿偏离是核心风险。',
    signal: '资金费率、基差、盘口深度和保证金缓冲共同决定开仓、换仓和退出。',
    sources: [
      {
        label: 'arXiv · Fundamentals of Perpetual Futures',
        url: 'https://arxiv.org/abs/2212.06888',
      },
    ],
    verifiedAt: '2026-09-14',
  },
  {
    englishName: 'Futures Basis Cash-and-Carry',
    family: '基差套利',
    id: 'futures-basis-cash-and-carry',
    integration: '依赖交割合约、现货持仓、融资和结算数据，属于独立的组合交易系统。',
    market: '具备稳定交割机制和足够流动性的现货与交割合约市场。',
    name: '交割合约基差策略',
    principle: '买入现货并卖出溢价期货，持有到期或基差收敛时平仓，收益来自锁定的价差。',
    rank: 8,
    risk: '基差可能先扩大造成追加保证金；融资、托管、交易成本和交易所风险会降低实际收益。',
    signal: '年化基差扣除融资费、手续费和保证金成本后超过安全阈值才入场。',
    sources: [
      {
        label: 'BIS · Crypto Carry',
        url: 'https://www.bis.org/publ/work1087.pdf',
      },
    ],
    verifiedAt: '2026-09-14',
  },
  {
    englishName: 'Triangular Arbitrage',
    family: '跨交易对套利',
    id: 'triangular-arbitrage',
    integration: '需要同一交易所多个交易对的实时盘口和原子化执行，不能直接由普通 K 线回测验证。',
    market: '交易对齐全、深度足够且撮合延迟较低的单一交易所。',
    name: '三角套利',
    principle: '通过三个交易对循环兑换，利用短暂的汇率不一致完成闭环交易。',
    rank: 9,
    risk: '机会窗口极短；部分成交、盘口变化、手续费和 API 延迟可能把理论利润变成亏损。',
    signal: '实时计算三个交易对的可成交价格，只有净价差覆盖全部费用和安全边际才执行。',
    sources: [
      {
        label: 'arXiv · Indirect Internal Conversions in Cryptocurrency Exchanges',
        url: 'https://arxiv.org/abs/2002.12274',
      },
    ],
    verifiedAt: '2026-09-14',
  },
  {
    englishName: 'Order-Book Market Making',
    family: '做市与微观结构',
    id: 'order-book-market-making',
    integration: '需要 Tick 或订单簿数据、限价单队列和库存控制，现有 5m K 线策略无法完整表达。',
    market: '交易量稳定、价差可观且撮合规则明确的高流动性市场。',
    name: '订单簿做市',
    principle: '在买卖两侧持续提供限价流动性，通过价差收入覆盖库存波动和被动成交风险。',
    rank: 10,
    risk: '逆向选择、库存积累、行情跳变和系统延迟是主要风险；回测难以还原真实排队成交。',
    signal: '以中间价、订单簿失衡、短期波动和库存偏离动态调整报价和挂单数量。',
    sources: [
      {
        label: 'arXiv · Fragmentation, Price Formation, and Cross-Impact in Bitcoin Markets',
        url: 'https://arxiv.org/abs/2108.09750',
      },
    ],
    verifiedAt: '2026-09-14',
  },
];
