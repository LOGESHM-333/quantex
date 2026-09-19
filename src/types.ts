export type AssetSymbol = 'GC=F' | 'BTC-USD' | 'NVDA';

export type NavTab =
  | 'overview'
  | 'markets'
  | 'quant'
  | 'correlation'
  | 'backtest'
  | 'predictions'
  | 'strategies'
  | 'regimes'
  | 'portfolio'
  | 'research'
  | 'ai'
  | 'settings'
  | 'profile'
  | 'intelligence';

export interface AssetMeta {
  symbol: string;
  name: string;
  type: string;
  currency: string;
  trading_days_per_year: number;
  description: string;
  quote: {
    symbol: string;
    price: number;
    previous_close: number;
    change: number;
    change_pct: number;
    timestamp: number;
    date: string;
    is_demo: boolean;
  };
}

export interface OHLCVRecord {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
  symbol: string;
  _demo?: boolean;
}

export interface AssetHistoryResponse {
  symbol: string;
  name: string;
  currency: string;
  is_demo: boolean;
  data_source: string;
  last_update: string;
  observations: number;
  history: OHLCVRecord[];
}

export interface AssetMetrics {
  symbol: string;
  observations: number;
  start_date: string;
  end_date: string;
  current_price: number;
  total_return: number;
  total_return_pct: number;
  annualized_return: number;
  annualized_return_pct: number;
  annualized_volatility: number;
  annualized_volatility_pct: number;
  sharpe_ratio: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  best_day_pct: number;
  worst_day_pct: number;
  avg_daily_return_pct: number;
  trading_days_convention: number;
  sma_20: (number | null)[];
  sma_50: (number | null)[];
  sma_200: (number | null)[];
  ema_20: (number | null)[];
  ema_50: (number | null)[];
  drawdown_curve: number[];
  rolling_vol_30: (number | null)[];
  daily_returns: number[];
}

export interface TradeRecord {
  id: number;
  timestamp: number;
  date: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  gross_value: number;
  transaction_cost: number;
  net_pnl: number;
  return_pct: number;
  holding_days: number;
  reason: string;
}

export interface EquityPoint {
  date: string;
  timestamp: number;
  strategy_value: number;
  benchmark_value: number;
  cash: number;
  position_value: number;
  price: number;
  signal: number;
  drawdown_pct?: number;
}

export interface BenchmarkMetrics {
  name: string;
  initial_capital: number;
  final_capital: number;
  total_return: number;
  total_return_pct: number;
  annualized_return: number;
  annualized_return_pct: number;
  annualized_volatility: number;
  annualized_volatility_pct: number;
  sharpe_ratio: number;
  max_drawdown: number;
  max_drawdown_pct: number;
}

export interface BacktestResult {
  symbol: string;
  strategy: string;
  parameters: Record<string, any>;
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_capital: number;
  net_profit: number;
  total_return: number;
  total_return_pct: number;
  annualized_return: number;
  annualized_return_pct: number;
  annualized_volatility: number;
  annualized_volatility_pct: number;
  sharpe_ratio: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  transaction_cost_pct: number;
  position_size_pct: number;
  total_transaction_costs: number;
  number_of_trades: number;
  total_executions: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  win_rate_pct: number;
  average_trade_pnl: number;
  best_trade_pnl: number;
  worst_trade_pnl: number;
  benchmark: BenchmarkMetrics;
  trades: TradeRecord[];
  equity_curve: EquityPoint[];
  is_demo?: boolean;
  data_source?: string;
}

export interface RegimeMetrics {
  regime: string;
  days_count: number;
  pct_of_time: number;
  total_return_pct: number;
  annualized_return_pct: number;
  annualized_volatility_pct: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
}

export interface RegimeResponse {
  symbol: string;
  ma_period_used: number;
  high_vol_threshold_pct: number;
  low_vol_threshold_pct: number;
  performance_by_regime: Record<string, RegimeMetrics>;
  timeline: {
    date: string;
    timestamp: number;
    price: number;
    trend_regime: string;
    vol_regime: string;
    ma_value: number | null;
    rolling_vol: number | null;
  }[];
}

export interface PortfolioResponse {
  start_date: string;
  end_date: string;
  observations: number;
  weights: Record<string, number>;
  initial_capital: number;
  final_capital: number;
  total_return_pct: number;
  annualized_return_pct: number;
  annualized_volatility_pct: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  correlation_matrix: Record<string, Record<string, number>>;
  equity_curve: {
    date: string;
    portfolio: number;
    drawdown_pct: number;
    [symbol: string]: any;
  }[];
}

export interface RobustnessGridResponse {
  symbol: string;
  fast_mas: number[];
  slow_mas: number[];
  return_matrix: (number | null)[][];
  sharpe_matrix: (number | null)[][];
  drawdown_matrix: (number | null)[][];
  disclaimer: string;
}

export interface SavedResearch {
  id: string;
  title: string;
  symbol: string;
  strategy: string;
  parameters: Record<string, any>;
  resultsSummary: {
    total_return_pct: number;
    sharpe_ratio: number;
    max_drawdown_pct: number;
    win_rate_pct: number;
    number_of_trades: number;
  };
  createdAt: string;
}

export interface VolatilityAssetSpike {
  symbol: string;
  name: string;
  current_volatility_pct: number;
  baseline_volatility_pct: number;
  spike_ratio: number;
  severity: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  alert: boolean;
  message: string;
  timestamp: string;
  is_demo: boolean;
  data_source: string;
}

export interface VolatilitySpikeResponse {
  status: string;
  assets: VolatilityAssetSpike[];
  active_spike: VolatilityAssetSpike | null;
  highest_severity: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  has_active_alert: boolean;
  last_update: string;
  thresholds: {
    elevated: number;
    high: number;
    critical: number;
  };
}

export interface VolatilityAlertRecord {
  id: string;
  timestamp: string;
  asset: string;
  symbol?: string;
  currentVolatilityPct: number;
  baselineVolatilityPct: number;
  spikeRatio: number;
  severity: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  alarmTriggered: boolean;
  voiceTriggered: boolean;
  message?: string;
}

