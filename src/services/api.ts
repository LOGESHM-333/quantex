import {
  AssetMeta,
  AssetHistoryResponse,
  AssetMetrics,
  BacktestResult,
  RegimeResponse,
  PortfolioResponse,
  RobustnessGridResponse,
  SavedResearch,
  VolatilitySpikeResponse,
  VolatilityAlertRecord
} from '../types';

const API_BASE = '/api';

export async function fetchAssets(
  demo: boolean = false
): Promise<{ status: string; assets: AssetMeta[]; demo_mode?: boolean }> {
  const res = await fetch(`${API_BASE}/assets?demo=${demo}`);
  if (!res.ok) throw new Error(`Failed to fetch assets: ${res.statusText}`);
  return res.json();
}

export async function fetchAssetHistory(
  symbol: string,
  range: string = '1y',
  demo: boolean = false
): Promise<AssetHistoryResponse> {
  const res = await fetch(`${API_BASE}/assets/${encodeURIComponent(symbol)}/history?range=${range}&demo=${demo}`);
  if (!res.ok) throw new Error(`Failed to fetch history for ${symbol}`);
  return res.json();
}

export async function fetchAssetMetrics(
  symbol: string,
  range: string = '1y',
  demo: boolean = false
): Promise<{ status: string; symbol: string; is_demo: boolean; data_source: string; last_update: string; metrics: AssetMetrics }> {
  const res = await fetch(`${API_BASE}/assets/${encodeURIComponent(symbol)}/metrics?range=${range}&demo=${demo}`);
  if (!res.ok) throw new Error(`Failed to fetch metrics for ${symbol}`);
  return res.json();
}

export async function fetchCorrelation(
  range: string = '1y',
  window: number = 60,
  demo: boolean = false
): Promise<{
  status: string;
  matrix: Record<string, Record<string, number>>;
  rolling_series: { date: string; btc_nvda: number; gold_btc: number; gold_nvda: number }[];
  observations: number;
  start_date: string;
  end_date: string;
}> {
  const res = await fetch(`${API_BASE}/correlation?range=${range}&window=${window}&demo=${demo}`);
  if (!res.ok) throw new Error('Failed to fetch correlation analysis');
  return res.json();
}

export async function fetchStrategies(): Promise<{ status: string; strategies: any[] }> {
  const res = await fetch(`${API_BASE}/strategies`);
  if (!res.ok) throw new Error('Failed to fetch strategies catalog');
  return res.json();
}

export async function fetchMarketRegimes(
  symbol: string = 'NVDA',
  range: string = '1y',
  maPeriod: number = 200,
  demo: boolean = false
): Promise<{ status: string; regimes: RegimeResponse }> {
  const res = await fetch(`${API_BASE}/market-regimes?symbol=${encodeURIComponent(symbol)}&range=${range}&ma_period=${maPeriod}&demo=${demo}`);
  if (!res.ok) throw new Error(`Failed to fetch market regimes for ${symbol}`);
  return res.json();
}

export async function runBacktestApi(payload: {
  symbol: string;
  range?: string;
  strategy: string;
  parameters: Record<string, any>;
  initial_capital?: number;
  transaction_cost?: number;
  position_size?: number;
  force_demo?: boolean;
}): Promise<{ status: string; result: BacktestResult }> {
  const res = await fetch(`${API_BASE}/backtest/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || data.status === 'error') {
    throw new Error(data.error || 'Backtest simulation failed');
  }
  return data;
}

export async function fetchRobustnessGrid(
  symbol: string = 'NVDA',
  range: string = '1y',
  demo: boolean = false
): Promise<{ status: string; grid: RobustnessGridResponse }> {
  const res = await fetch(`${API_BASE}/backtest/robustness`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, range, force_demo: demo })
  });
  if (!res.ok) throw new Error('Failed to calculate robustness heatmap');
  return res.json();
}

export async function analyzePortfolioApi(payload: {
  weights: Record<string, number>;
  range?: string;
  initial_capital?: number;
  force_demo?: boolean;
}): Promise<{ status: string; portfolio: PortfolioResponse }> {
  const res = await fetch(`${API_BASE}/portfolio/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || data.status === 'error') {
    throw new Error(data.error || 'Portfolio analysis calculation error');
  }
  return data;
}

export async function askAIExplainer(
  question: string,
  backtestResult: BacktestResult,
  regimeData?: any
): Promise<{ status: string; explanation: string; disclaimer: string; model?: string }> {
  const res = await fetch(`${API_BASE}/ai/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, backtestResult, regimeData })
  });
  if (!res.ok) throw new Error('AI analysis service unavailable');
  return res.json();
}

export async function fetchSavedResearch(): Promise<{ status: string; saved: SavedResearch[] }> {
  const res = await fetch(`${API_BASE}/research/saved`);
  if (!res.ok) throw new Error('Failed to load saved research runs');
  return res.json();
}
export async function fetchPredictionsApi(payload: {
  symbol: string;
  range?: string;
  demo?: boolean;
}): Promise<{ status: string; predictions: { date: string; value: number }[] }> {
  const res = await fetch(`${API_BASE}/predictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || data.status === 'error') {
    throw new Error(data.error || 'Prediction request failed');
  }
  return data;
}

export async function saveResearchApi(payload: {
  title: string;
  symbol: string;
  strategy: string;
  parameters: Record<string, any>;
  resultsSummary: any;
}): Promise<{ status: string; savedItem: SavedResearch }> {
  const res = await fetch(`${API_BASE}/research/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to save research session');
  return res.json();
}

export async function deleteResearchApi(id: string): Promise<void> {
  await fetch(`${API_BASE}/research/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export async function askAIChatApi(
  messages: { role: 'user' | 'assistant'; content: string }[],
  activeContext?: any
): Promise<{ status: string; reply: string; model?: string }> {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, activeContext })
  });
  const data = await res.json();
  if (!res.ok || data.status === 'error') {
    throw new Error(data.error || 'AI Chat service error');
  }
  return data;
}

export async function fetchVolatilitySpikesApi(
  demo: boolean = false,
  thresholds?: { elevated?: number; high?: number; critical?: number }
): Promise<VolatilitySpikeResponse> {
  let url = `${API_BASE}/investor/volatility-spike?demo=${demo}`;
  if (thresholds) {
    if (thresholds.elevated) url += `&elevated=${thresholds.elevated}`;
    if (thresholds.high) url += `&high=${thresholds.high}`;
    if (thresholds.critical) url += `&critical=${thresholds.critical}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch volatility spikes: ${res.statusText}`);
  return res.json();
}

export async function fetchVolatilityAlertHistoryApi(): Promise<{ status: string; history: VolatilityAlertRecord[] }> {
  const res = await fetch(`${API_BASE}/investor/volatility-spike/history`);
  if (!res.ok) throw new Error(`Failed to fetch volatility alert history: ${res.statusText}`);
  return res.json();
}

export async function logVolatilityAlertApi(record: Partial<VolatilityAlertRecord>): Promise<{ status: string; record: VolatilityAlertRecord }> {
  const res = await fetch(`${API_BASE}/investor/volatility-spike/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });
  if (!res.ok) throw new Error(`Failed to log volatility alert: ${res.statusText}`);
  return res.json();
}


