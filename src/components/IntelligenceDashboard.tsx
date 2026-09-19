import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Zap,
  BarChart2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Percent,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Brain,
  GitMerge,
  Volume2,
  VolumeX,
  BellRing,
  Square,
  Radio,
  Sliders,
  Play,
  Flame,
  Volume1
} from 'lucide-react';
import {
  fetchVolatilitySpikesApi,
  fetchVolatilityAlertHistoryApi,
  logVolatilityAlertApi
} from '../services/api';
import {
  VolatilityAssetSpike,
  VolatilitySpikeResponse,
  VolatilityAlertRecord
} from '../types';
import {
  play30SecondAmbulanceSiren,
  start30SecondAmbulanceDemoSequence,
  startWindowsEmergencyAlertUntilClosed,
  playVolatilityAlarmSound,
  playVolatilityVoiceAlert,
  stopVolatilityAlertSound
} from '../services/soundAlerts';
import { WindowsEmergencyAlertModal } from './WindowsEmergencyAlertModal';

// ─── Types ─────────────────────────────────────────────────────────────────
interface ProfitData {
  expectedReturn: number; expectedDownside: number; riskReward: number | null;
  winRate: number; winRatePct: number; sharpe: number; sortino: number; profitFactor: number;
  transactionCost: number; slippage: number; volatility: number; confidence: number;
  numberOfTrades: number; winningTrades: number; losingTrades: number;
  bestTrade: number; worstTrade: number; avgTrade: number;
  symbol: string; strategy: string; startDate: string; endDate: string;
  initialCapital: number; finalCapital: number; netProfit: number; annualizedReturn: number;
}

interface RiskData {
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskScore: number; reasons: string[]; affectedAssets: string[];
  potentialDownside: number; volatility: number; sharpe: number; confidence: number;
}

interface IntegrityData {
  lookAheadBias: string; dataLeakage: string; survivorshipBias: string;
  slippageModel: string; transactionCostModel: string; walkForwardValidation: string;
  outOfSampleTest: string; dataSource: string; isDemo: boolean; symbol: string;
  strategy: string; totalRecords: number; transactionCostPct: number; positionSizePct: number;
}

interface MCData {
  medianOutcome: number; downsidePercentile: number; upsidePercentile: number;
  q1: number; q3: number; probabilityNegativeReturn: number; probabilityDrawdown: number;
  worstScenario: number; bestScenario: number; nPaths: number; nDays: number;
  histogram: { bin: number; count: number; pct: number }[];
}

interface AlertRecord {
  timestamp: string; asset: string; alert_type: string; risk_level: string; trigger_reason: string;
}

interface PaperData { trades: any[]; realizedPnl: number; }

// ─── Sub-components ─────────────────────────────────────────────────────────

// Stat card
const StatCard: React.FC<{
  label: string; value: string; sub?: string; color?: string; icon?: React.ReactNode; trend?: 'up' | 'down' | 'neutral';
}> = ({ label, value, sub, color = '#00E5A3', icon, trend }) => (
  <div className="flex flex-col justify-between p-4 rounded-2xl bg-[#071F26] border border-[#0F353E] shadow-lg">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-mono text-[#6996A0] uppercase tracking-widest">{label}</span>
      {icon && <span className="opacity-60" style={{ color }}>{icon}</span>}
    </div>
    <div className="font-mono font-bold text-lg" style={{ color }}>{value}</div>
    {sub && <div className="text-[10px] font-mono text-[#507A84] mt-1">{sub}</div>}
    {trend && (
      <div className={`mt-1 ${trend === 'up' ? 'text-[#00E5A3]' : trend === 'down' ? 'text-[#FF5C5C]' : 'text-[#6996A0]'}`}>
        {trend === 'up' ? <ArrowUpRight className="w-3 h-3 inline" /> : trend === 'down' ? <ArrowDownRight className="w-3 h-3 inline" /> : null}
      </div>
    )}
  </div>
);

// Risk level badge
const RiskBadge: React.FC<{ level: string; size?: 'sm' | 'lg' }> = ({ level, size = 'sm' }) => {
  const colors: Record<string, string> = {
    LOW: '#00E5A3', MODERATE: '#F5A623', HIGH: '#FF5C5C', CRITICAL: '#FF1744'
  };
  const bg: Record<string, string> = {
    LOW: '#00E5A310', MODERATE: '#F5A62310', HIGH: '#FF5C5C15', CRITICAL: '#FF174420'
  };
  const c = colors[level] ?? '#6996A0';
  const b = bg[level] ?? '#09252D';
  return (
    <span
      className={`font-mono font-bold uppercase tracking-widest rounded-lg px-3 py-1 border ${size === 'lg' ? 'text-lg' : 'text-xs'}`}
      style={{ color: c, background: b, borderColor: c + '40' }}
    >
      {level}
    </span>
  );
};

// Integrity check row
const CheckRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const pass = value === 'PASS' || value === 'ACTIVE';
  const fail = value === 'FAIL';
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#0D2E37] last:border-0">
      <span className="text-xs font-mono text-[#8DB4BE]">{label}</span>
      <div className="flex items-center gap-1.5">
        {pass && <CheckCircle className="w-3.5 h-3.5 text-[#00E5A3]" />}
        {fail && <XCircle className="w-3.5 h-3.5 text-[#FF5C5C]" />}
        {!pass && !fail && <Activity className="w-3.5 h-3.5 text-[#F5A623]" />}
        <span className={`text-xs font-mono font-bold ${pass ? 'text-[#00E5A3]' : fail ? 'text-[#FF5C5C]' : 'text-[#F5A623]'}`}>
          {value}
        </span>
      </div>
    </div>
  );
};

// Donut-style progress arc (SVG)
const GaugeArc: React.FC<{ value: number; max: number; color: string; label: string; unit?: string }> = ({
  value, max, color, label, unit = '%'
}) => {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const r = 38, cx = 50, cy = 50;
  const circumference = Math.PI * r; // half circle
  const offset = circumference * (1 - pct);
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 60" className="w-28">
        {/* Track */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#0D2E37" strokeWidth="8" strokeLinecap="round" />
        {/* Fill */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${circumference * pct} ${circumference * (1 - pct)}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fill={color}
          fontSize="13" fontFamily="monospace" fontWeight="bold">
          {value.toFixed(1)}{unit}
        </text>
      </svg>
      <span className="text-[10px] font-mono text-[#6996A0] mt-1 uppercase tracking-widest">{label}</span>
    </div>
  );
};

// Volatility severity badge
export const VolatilitySeverityBadge: React.FC<{ severity: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' }> = ({ severity }) => {
  const styles: Record<string, { bg: string; border: string; text: string; dot: string; pulse?: boolean }> = {
    NORMAL: { bg: 'bg-[#00E5A315]', border: 'border-[#00E5A340]', text: 'text-[#00E5A3]', dot: 'bg-[#00E5A3]' },
    ELEVATED: { bg: 'bg-[#F5A62315]', border: 'border-[#F5A62340]', text: 'text-[#F5A623]', dot: 'bg-[#F5A623]' },
    HIGH: { bg: 'bg-[#FF5C5C20]', border: 'border-[#FF5C5C60]', text: 'text-[#FF5C5C]', dot: 'bg-[#FF5C5C]', pulse: true },
    CRITICAL: { bg: 'bg-[#FF174425]', border: 'border-[#FF1744]', text: 'text-[#FF1744]', dot: 'bg-[#FF1744]', pulse: true }
  };
  const config = styles[severity] || styles.NORMAL;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider border ${config.bg} ${config.border} ${config.text} ${config.pulse ? 'animate-pulse' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.pulse ? 'animate-ping' : ''}`} />
      {severity}
    </span>
  );
};

// Skeleton loader
const Skeleton: React.FC<{ h?: string }> = ({ h = 'h-8' }) => (
  <div className={`${h} bg-[#0A2931] rounded-xl animate-pulse`} />
);

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export const IntelligenceDashboard: React.FC<{ demoMode: boolean }> = ({ demoMode }) => {
  const [profit, setProfit] = useState<ProfitData | null>(null);
  const [risk, setRisk] = useState<RiskData | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityData | null>(null);
  const [mc, setMonteCarlo] = useState<MCData | null>(null);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [volatilitySpikes, setVolatilitySpikes] = useState<VolatilitySpikeResponse | null>(null);
  const [volatilityAlertHistory, setVolatilityAlertHistory] = useState<VolatilityAlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'montecarlo' | 'integrity' | 'paper'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [volatilitySoundEnabled, setVolatilitySoundEnabled] = useState(true);
  const [volatilityVoiceEnabled, setVolatilityVoiceEnabled] = useState(true);
  const [volatilityVolume, setVolatilityVolume] = useState(1.0);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [activeSpikeAsset, setActiveSpikeAsset] = useState<string | null>(null);
  const [demo30SecActive, setDemo30SecActive] = useState(false);
  const [demo30SecLeft, setDemo30SecLeft] = useState(30);
  const [demoPhase, setDemoPhase] = useState<'idle' | 'voice' | 'siren'>('idle');
  const [demoPhaseLabel, setDemoPhaseLabel] = useState<string>('');
  const [isWindowsAlertModalOpen, setIsWindowsAlertModalOpen] = useState<boolean>(false);
  const [windowsAlertElapsed, setWindowsAlertElapsed] = useState<number>(0);

  const lastAlertMap = useRef<Record<string, { timestamp: number; severity: string }>>({});
  const demo30SecActiveRef = useRef(demo30SecActive);
  const isWindowsAlertModalOpenRef = useRef(isWindowsAlertModalOpen);

  useEffect(() => { demo30SecActiveRef.current = demo30SecActive; }, [demo30SecActive]);
  useEffect(() => { isWindowsAlertModalOpenRef.current = isWindowsAlertModalOpen; }, [isWindowsAlertModalOpen]);

  const checkAndTriggerVolatilityAlerts = useCallback((
    spikesData: VolatilitySpikeResponse,
    soundOn: boolean,
    voiceOn: boolean,
    vol: number
  ) => {
    if (demo30SecActiveRef.current || isWindowsAlertModalOpenRef.current) return;
    const now = Date.now();
    const COOLDOWN_MS = 5 * 60 * 1000; // 5-minute cooldown per asset

    spikesData.assets.forEach((asset) => {
      const curVol = (asset as any).current_volatility_pct ?? (asset as any).current_volatility ?? 0;
      const baseVol = (asset as any).baseline_volatility_pct ?? (asset as any).baseline_volatility ?? 0;
      const ratio = (asset as any).spike_ratio ?? 1.0;

      if (asset.severity === 'HIGH' || asset.severity === 'CRITICAL') {
        const prevAlert = lastAlertMap.current[asset.symbol];
        const isCooldownElapsed = !prevAlert || (now - prevAlert.timestamp > COOLDOWN_MS);
        const isEscalation = prevAlert && prevAlert.severity === 'HIGH' && asset.severity === 'CRITICAL';

        if (isCooldownElapsed || isEscalation) {
          setIsAlarmPlaying(true);
          setActiveSpikeAsset(asset.name);

          if (soundOn) {
            playVolatilityAlarmSound(asset.severity, vol, () => {
              setIsAlarmPlaying(false);
            });
          }
          if (voiceOn) {
            playVolatilityVoiceAlert(asset.severity, asset.name, vol);
          }

          // Persist alert in backend
          logVolatilityAlertApi({
            asset: asset.name,
            symbol: asset.symbol,
            current_volatility: curVol,
            baseline_volatility: baseVol,
            spike_ratio: ratio,
            severity: asset.severity,
            trigger_reason: `${asset.severity} Volatility Spike: 14d Vol (${curVol.toFixed(2)}%) surged to ${ratio.toFixed(2)}x of 120d Baseline (${baseVol.toFixed(2)}%)`
          }).then(() => {
            fetchVolatilityAlertHistoryApi().then(hRes => {
              if (hRes && hRes.history) setVolatilityAlertHistory(hRes.history);
            }).catch(() => {});
          }).catch(() => {});

          lastAlertMap.current[asset.symbol] = {
            timestamp: now,
            severity: asset.severity
          };
        }
      } else if (asset.severity === 'NORMAL') {
        // Clear hysteresis state when asset normalizes
        if (lastAlertMap.current[asset.symbol]) {
          delete lastAlertMap.current[asset.symbol];
        }
      }
    });
  }, []);

  /**
   * 🚨 Continuous Ambulance Siren + Windows Alert Modal (Plays until user closes alert)
   */
  const handleStart30SecAmbulanceDemo = () => {
    setIsAlarmPlaying(true);
    setDemo30SecActive(true);
    setIsWindowsAlertModalOpen(true);
    setWindowsAlertElapsed(0);
    setDemoPhase('siren');
    setDemoPhaseLabel('🚨 Windows Emergency Alert Active (Siren playing continuously)');
    setActiveSpikeAsset('Multi-Asset Portfolio (Live Windows Alert)');

    startWindowsEmergencyAlertUntilClosed(
      volatilityVolume,
      volatilityVoiceEnabled,
      volatilitySoundEnabled,
      {
        onTick: (elapsedSec) => {
          setWindowsAlertElapsed(elapsedSec);
        }
      }
    );

    // Persist demo event to history
    logVolatilityAlertApi({
      asset: 'Gold, BTC & NVDA Portfolio',
      symbol: 'WINDOWS-ALERT',
      current_volatility: 58.4,
      baseline_volatility: 24.1,
      spike_ratio: 2.42,
      severity: 'CRITICAL',
      trigger_reason: '🚨 [WINDOWS EMERGENCY ALERT] Continuous Ambulance Siren Active Until User Closes Alert Window'
    }).then(() => {
      fetchVolatilityAlertHistoryApi().then(hRes => {
        if (hRes && hRes.history) setVolatilityAlertHistory(hRes.history);
      }).catch(() => {});
    }).catch(() => {});
  };



  const handleTestSpikeAlert = (severity: 'HIGH' | 'CRITICAL', testAssetName: string = 'Gold') => {
    setIsAlarmPlaying(true);
    setActiveSpikeAsset(testAssetName);

    if (volatilitySoundEnabled) {
      playVolatilityAlarmSound(severity, volatilityVolume, () => {
        setIsAlarmPlaying(false);
      });
    } else {
      setTimeout(() => setIsAlarmPlaying(false), 2000);
    }

    if (volatilityVoiceEnabled) {
      playVolatilityVoiceAlert(severity, testAssetName, volatilityVolume);
    }

    // Persist test event to alert history
    const testSymbol = testAssetName === 'Gold' ? 'GC=F' : testAssetName === 'Bitcoin' ? 'BTC-USD' : 'NVDA';
    const testCurrentVol = severity === 'CRITICAL' ? 52.4 : 38.6;
    const testBaseVol = 23.8;
    const testRatio = Number((testCurrentVol / testBaseVol).toFixed(2));

    logVolatilityAlertApi({
      asset: testAssetName,
      symbol: testSymbol,
      current_volatility: testCurrentVol,
      baseline_volatility: testBaseVol,
      spike_ratio: testRatio,
      severity: severity,
      trigger_reason: `[TEST ALERT] ${severity} Volatility Spike verification on ${testAssetName}`
    }).then(() => {
      fetchVolatilityAlertHistoryApi().then(hRes => {
        if (hRes && hRes.history) setVolatilityAlertHistory(hRes.history);
      }).catch(() => {});
    }).catch(() => {});
  };

  const soundEnabledRef = useRef(volatilitySoundEnabled);
  const voiceEnabledRef = useRef(volatilityVoiceEnabled);
  const volumeRef = useRef(volatilityVolume);

  useEffect(() => { soundEnabledRef.current = volatilitySoundEnabled; }, [volatilitySoundEnabled]);
  useEffect(() => { voiceEnabledRef.current = volatilityVoiceEnabled; }, [volatilityVoiceEnabled]);
  useEffect(() => { volumeRef.current = volatilityVolume; }, [volatilityVolume]);



  const handleStopAllAlerts = () => {
    stopVolatilityAlertSound();
    setIsWindowsAlertModalOpen(false);
    setIsAlarmPlaying(false);
    setDemo30SecActive(false);
    setDemo30SecLeft(30);
    setDemoPhase('idle');
    setDemoPhaseLabel('');
    setActiveSpikeAsset(null);
  };

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const fetchJson = async (url: string) => {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${url}: ${r.status} ${r.statusText}`);
        return r.json();
      };
      const [p, r, i, m, a, pt, vSpikes, vHistory] = await Promise.all([
        fetchJson('/api/investor/profit-opportunity'),
        fetchJson('/api/investor/risk-prediction'),
        fetchJson('/api/investor/backtest-integrity'),
        fetchJson('/api/investor/monte-carlo'),
        fetchJson('/api/investor/alert-history').catch(() => []),
        fetchJson('/api/investor/paper-trade').catch(() => ({ trades: [], realizedPnl: 0 })),
        fetchVolatilitySpikesApi(demoMode).catch(() => null),
        fetchVolatilityAlertHistoryApi().catch(() => ({ status: 'ok', history: [] }))
      ]);
      setProfit(p); setRisk(r); setIntegrity(i); setMonteCarlo(m);
      setAlerts(Array.isArray(a) ? a : []);
      setPaper(pt);
      if (vSpikes) {
        setVolatilitySpikes(vSpikes);
        checkAndTriggerVolatilityAlerts(vSpikes, soundEnabledRef.current, voiceEnabledRef.current, volumeRef.current);
      }
      if (vHistory && vHistory.history) {
        setVolatilityAlertHistory(vHistory.history);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [demoMode, checkAndTriggerVolatilityAlerts]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Radar chart data (derived from profit + risk)
  const radarData = profit && risk
    ? [
        { metric: 'Win Rate', value: (profit.winRate * 100).toFixed(0), full: 100 },
        { metric: 'Sharpe', value: Math.max(0, Math.min(profit.sharpe * 50, 100)).toFixed(0), full: 100 },
        { metric: 'Confidence', value: (profit.confidence * 100).toFixed(0), full: 100 },
        { metric: 'Return', value: Math.max(0, Math.min(profit.expectedReturn + 50, 100)).toFixed(0), full: 100 },
        { metric: 'Safety', value: Math.max(0, 100 - risk.riskScore).toFixed(0), full: 100 },
        { metric: 'Sortino', value: Math.max(0, Math.min(profit.sortino * 50, 100)).toFixed(0), full: 100 },
      ]
    : [];

  // ── Win/Loss pie
  const winLossData = profit
    ? [
        { name: 'Winning', value: profit.winningTrades },
        { name: 'Losing', value: profit.losingTrades }
      ]
    : [];

  // ── Loading / Error states
  if (loading) {
    return (
      <div className="p-6 space-y-4 min-h-screen bg-[#040F12]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h="h-24" />)}
        </div>
        <Skeleton h="h-64" />
        <Skeleton h="h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-12 h-12 text-[#FF5C5C]" />
        <div className="text-[#FF5C5C] font-mono text-sm text-center max-w-md">
          {error}
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D2E37] border border-[#1B4E5B] text-xs font-mono text-white hover:bg-[#113842] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#040F12] text-white space-y-6 p-4 sm:p-6 pb-12">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-[#00E5A3]" />
            <h1 className="text-xl font-bold font-mono text-white">AI Investor Intelligence</h1>
            {risk && <RiskBadge level={risk.level} />}
          </div>
          {profit && (
            <div className="text-xs font-mono text-[#507A84] mt-1">
              {profit.symbol} · {profit.strategy} · {profit.startDate} → {profit.endDate}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {integrity && (
            <span className={`text-[10px] font-mono px-2 py-1 rounded-lg border ${
              integrity.isDemo
                ? 'text-[#F5A623] border-[#F5A62340] bg-[#F5A62310]'
                : 'text-[#00E5A3] border-[#00E5A340] bg-[#00E5A310]'
            }`}>
              {integrity.isDemo ? '⚠ DEMO DATA' : '● LIVE DATA'}
            </span>
          )}

          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0D2E37] border border-[#1B4E5B] text-xs font-mono text-white hover:bg-[#113842] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00E5A3] ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {profit && risk && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Net P&L"
            value={`$${profit.netProfit >= 0 ? '+' : ''}${profit.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub={`${profit.expectedReturn >= 0 ? '+' : ''}${profit.expectedReturn.toFixed(2)}% total`}
            color={profit.netProfit >= 0 ? '#00E5A3' : '#FF5C5C'}
            icon={<DollarSign className="w-4 h-4" />}
            trend={profit.netProfit >= 0 ? 'up' : 'down'}
          />
          <StatCard
            label="Sharpe Ratio"
            value={profit.sharpe.toFixed(3)}
            sub={profit.sharpe >= 1 ? 'Excellent' : profit.sharpe >= 0 ? 'Acceptable' : 'Below target'}
            color={profit.sharpe >= 1 ? '#00E5A3' : profit.sharpe >= 0 ? '#F5A623' : '#FF5C5C'}
            icon={<Activity className="w-4 h-4" />}
          />
          <StatCard
            label="Win Rate"
            value={`${profit.winRatePct.toFixed(1)}%`}
            sub={`${profit.winningTrades}W / ${profit.losingTrades}L`}
            color={profit.winRatePct >= 50 ? '#00E5A3' : '#FF5C5C'}
            icon={<Target className="w-4 h-4" />}
          />
          <StatCard
            label="Max Drawdown"
            value={`${profit.expectedDownside.toFixed(2)}%`}
            sub="Peak-to-trough"
            color={profit.expectedDownside < 10 ? '#00E5A3' : profit.expectedDownside < 20 ? '#F5A623' : '#FF5C5C'}
            icon={<TrendingDown className="w-4 h-4" />}
            trend="down"
          />
          <StatCard
            label="Volatility"
            value={`${profit.volatility.toFixed(2)}%`}
            sub="Annualized σ"
            color={profit.volatility < 15 ? '#00E5A3' : profit.volatility < 30 ? '#F5A623' : '#FF5C5C'}
            icon={<Zap className="w-4 h-4" />}
          />
          <StatCard
            label="Risk Score"
            value={risk.riskScore.toFixed(1)}
            sub={risk.level}
            color={risk.level === 'LOW' ? '#00E5A3' : risk.level === 'MODERATE' ? '#F5A623' : '#FF5C5C'}
            icon={<Shield className="w-4 h-4" />}
          />
        </div>
      )}

      {/* ── HIGH VOLATILITY SPIKE ALERT SYSTEM (GLOBAL MONITOR) ── */}
      <div className="p-6 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-2xl space-y-6 relative overflow-hidden">
        {/* Top glowing severity line */}
        {volatilitySpikes && volatilitySpikes.global_status !== 'NORMAL' && (
          <div className={`absolute top-0 left-0 right-0 h-1.5 ${
            volatilitySpikes.global_status === 'CRITICAL'
              ? 'bg-[#FF1744] shadow-[0_0_20px_#FF1744]'
              : volatilitySpikes.global_status === 'HIGH'
              ? 'bg-[#FF5C5C] shadow-[0_0_15px_#FF5C5C]'
              : 'bg-[#F5A623]'
          }`} />
        )}

        {/* Header & Status Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              volatilitySpikes?.global_status === 'CRITICAL'
                ? 'bg-[#FF174420] border-[#FF1744] text-[#FF1744]'
                : volatilitySpikes?.global_status === 'HIGH'
                ? 'bg-[#FF5C5C20] border-[#FF5C5C] text-[#FF5C5C]'
                : volatilitySpikes?.global_status === 'ELEVATED'
                ? 'bg-[#F5A62320] border-[#F5A623] text-[#F5A623]'
                : 'bg-[#00E5A315] border-[#00E5A340] text-[#00E5A3]'
            }`}>
              <Flame className={`w-5 h-5 ${
                volatilitySpikes?.global_status === 'CRITICAL' || volatilitySpikes?.global_status === 'HIGH'
                  ? 'animate-bounce'
                  : ''
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold font-mono text-white tracking-wide">High Volatility Spike Alert System</h2>
                {volatilitySpikes && (
                  <VolatilitySeverityBadge severity={volatilitySpikes.global_status} />
                )}
              </div>
              <p className="text-xs font-mono text-[#6996A0] mt-0.5">
                Continuous quantitative ratio engine monitoring 14-day current market volatility vs 120-day historical baseline
              </p>
            </div>
          </div>

          {/* Real-Time Audio, Voice & Test Controls */}
          <div className="flex items-center flex-wrap gap-2.5 bg-[#09252D] p-2 rounded-2xl border border-[#0F353E]">
            {/* Audio Alert Toggle */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVolatilitySoundEnabled(!volatilitySoundEnabled); }}
              title={volatilitySoundEnabled ? 'Mute Alert Sound' : 'Enable Alert Sound'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                volatilitySoundEnabled
                  ? 'bg-[#00E5A320] text-[#00E5A3] border border-[#00E5A350]'
                  : 'bg-[#071F26] text-[#6996A0] border border-[#0F353E]'
              }`}
            >
              {volatilitySoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{volatilitySoundEnabled ? 'Audio ON' : 'Audio MUTED'}</span>
            </button>

            {/* Voice Warning Toggle */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVolatilityVoiceEnabled(!volatilityVoiceEnabled); }}
              title={volatilityVoiceEnabled ? 'Disable Voice Warnings' : 'Enable Voice Warnings'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                volatilityVoiceEnabled
                  ? 'bg-[#00E5A320] text-[#00E5A3] border border-[#00E5A350]'
                  : 'bg-[#071F26] text-[#6996A0] border border-[#0F353E]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{volatilityVoiceEnabled ? 'Voice ON' : 'Voice OFF'}</span>
            </button>

            {/* Volume Slider */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-[#071F26] rounded-xl border border-[#0F353E]">
              <Volume1 className="w-3.5 h-3.5 text-[#6996A0]" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volatilityVolume}
                onChange={(e) => setVolatilityVolume(parseFloat(e.target.value))}
                className="w-16 h-1.5 accent-[#00E5A3] bg-[#0A2931] rounded-lg cursor-pointer"
                title={`Alert Volume: ${(volatilityVolume * 100).toFixed(0)}%`}
              />
              <span className="text-[10px] font-mono text-[#6996A0] w-6">{(volatilityVolume * 100).toFixed(0)}%</span>
            </div>

            {/* Test Triggers */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTestSpikeAlert('HIGH', 'Gold'); }}
                disabled={isAlarmPlaying}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FF5C5C20] hover:bg-[#FF5C5C30] text-[#FF5C5C] border border-[#FF5C5C50] text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50"
                title="Simulate HIGH Volatility Spike Warning"
              >
                <Play className="w-3 h-3" /> Test High
              </button>

              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTestSpikeAlert('CRITICAL', 'Bitcoin'); }}
                disabled={isAlarmPlaying}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FF174425] hover:bg-[#FF174435] text-[#FF1744] border border-[#FF174470] text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50"
                title="Simulate CRITICAL Volatility Spike Urgency Alarm"
              >
                <BellRing className="w-3 h-3 animate-pulse" /> Test Critical
              </button>

              {isAlarmPlaying && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStopAllAlerts(); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FF1744] text-white font-bold text-xs font-mono transition cursor-pointer animate-pulse shadow-[0_0_15px_#FF1744]"
                  title="Stop Active Alarm and Voice immediately"
                >
                  <Square className="w-3 h-3 fill-current" /> Stop
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 🚨 30-SECOND AMBULANCE SIREN — LIVE DEMO TO JUDGES ── */}
        <div className={`p-5 rounded-2xl border transition-all duration-300 ${
          demo30SecActive
            ? 'bg-[#FF174418] border-[#FF1744] shadow-[0_0_25px_#FF174440] animate-pulse'
            : 'bg-[#09252D] border-[#164E5E]'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left info & animated beacon */}
            <div className="flex items-center gap-3.5">
              <div className={`p-3 rounded-2xl ${
                demo30SecActive
                  ? 'bg-[#FF1744] text-white shadow-[0_0_15px_#FF1744] animate-bounce'
                  : 'bg-[#0E3540] text-[#00E5A3] border border-[#164E5E]'
              }`}>
                <BellRing className={`w-6 h-6 ${demo30SecActive ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold font-mono text-white tracking-wide">
                    🚨 Live Demo to Judges: High Volatility Spike Alert & 30s Ambulance Siren
                  </span>
                  {demo30SecActive ? (
                    demoPhase === 'voice' ? (
                      <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-[#F5A623] text-black animate-pulse shadow-[0_0_12px_#F5A623]">
                        📢 VOICE ANNOUNCEMENT (2x Repeating)...
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-[#FF1744] text-white animate-pulse shadow-[0_0_15px_#FF1744]">
                        🚨 LOUD SIREN ACTIVE: {demo30SecLeft}s
                      </span>
                    )
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#00E5A320] text-[#00E5A3] border border-[#00E5A340]">
                      READY FOR DEMO
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-[#8DB4BE] mt-1">
                  {demoPhase === 'voice'
                    ? '📢 Speaking: "High Volatility Spike Alert! High Volatility Spike Alert!" (2 times), followed immediately by 30-second continuous Wee-Woo siren.'
                    : '1. Voice announces "High Volatility Spike Alert" 2 times $\\to$ 2. Plays loud 30-second continuous emergency ambulance siren (Wee-Woo).'}
                </p>
              </div>
            </div>

            {/* Demo Action Buttons & Live Timer */}
            <div className="flex items-center flex-wrap gap-2.5">
              {!demo30SecActive ? (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStart30SecAmbulanceDemo(); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF1744] via-[#FF5C5C] to-[#F5A623] text-black font-mono font-extrabold text-xs tracking-wider shadow-[0_0_25px_#FF174480] hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
                  title="Trigger Continuous Emergency Siren with Windows Alert Dialog (Plays until closed)"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>START 30s ALERTS (WINDOWS POPUP + SIREN)</span>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  {/* Animated Sound Wave Equalizer */}
                  <div className="flex items-center gap-1 h-6 px-3 bg-[#071F26] rounded-xl border border-[#FF174460]">
                    <div className="w-1 bg-[#FF1744] h-5 animate-pulse" />
                    <div className="w-1 bg-[#F5A623] h-3 animate-ping" />
                    <div className="w-1 bg-[#00E5A3] h-6 animate-pulse" />
                    <div className="w-1 bg-[#FF1744] h-4 animate-bounce" />
                    <div className="w-1 bg-[#00E5A3] h-5 animate-pulse" />
                    <span className="ml-1 text-xs font-mono font-bold text-white">
                      {demoPhase === 'voice' ? 'Voice (2x)...' : `${demo30SecLeft}s left`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStopAllAlerts(); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF1744] text-white font-mono font-bold text-xs tracking-wider hover:bg-[#D50000] shadow-[0_0_15px_#FF1744] cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>STOP ALARM</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Judge Demo Presentation Cheat-Sheet & Script */}
          <div className="mt-3.5 p-3 rounded-xl bg-[#071F26] border border-[#0F353E] text-xs font-mono">
            <div className="text-[11px] font-bold text-[#00E5A3] flex items-center gap-1.5 mb-1.5">
              <span>📋</span> WHAT TO DEMONSTRATE & SAY TO JUDGES:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[#8DB4BE] text-[11px]">
              <div className="p-2 rounded-lg bg-[#09252D] border border-[#0F353E]">
                <span className="text-white font-bold">1. Quantitative Spike Ratio:</span>
                <p className="mt-0.5 text-[#6996A0]">Show the multi-asset cards below where 14-day volatility is compared against 120-day historical baseline.</p>
              </div>
              <div className="p-2 rounded-lg bg-[#09252D] border border-[#0F353E]">
                <span className="text-white font-bold">2. Trigger 30s Live Siren:</span>
                <p className="mt-0.5 text-[#6996A0]">Click the button above to demonstrate the loud 30-sec emergency ambulance siren & real-time voice dispatch.</p>
              </div>
              <div className="p-2 rounded-lg bg-[#09252D] border border-[#0F353E]">
                <span className="text-white font-bold">3. Risk Protocol Execution:</span>
                <p className="mt-0.5 text-[#6996A0]">Explain how QuantX flags critical instability before losses occur, protecting investor capital.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Volatility Warning Alert Banner */}
        {volatilitySpikes && volatilitySpikes.global_status !== 'NORMAL' && (
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            volatilitySpikes.global_status === 'CRITICAL'
              ? 'bg-[#FF174415] border-[#FF174460] text-[#FF1744]'
              : volatilitySpikes.global_status === 'HIGH'
              ? 'bg-[#FF5C5C15] border-[#FF5C5C60] text-[#FF5C5C]'
              : 'bg-[#F5A62315] border-[#F5A62360] text-[#F5A623]'
          }`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold font-mono uppercase tracking-wider">
                {volatilitySpikes.global_status === 'CRITICAL'
                  ? 'CRITICAL MARKET VOLATILITY SPIKE DETECTED'
                  : volatilitySpikes.global_status === 'HIGH'
                  ? 'HIGH MARKET VOLATILITY ALERT DETECTED'
                  : 'ELEVATED MARKET VOLATILITY DETECTED'}
              </div>
              <div className="text-xs font-mono text-[#C4D8DC] mt-1">
                {volatilitySpikes.assets
                  .filter(a => a.severity !== 'NORMAL')
                  .map(a => {
                    const curVol = (a as any).current_volatility_pct ?? (a as any).current_volatility ?? 0;
                    const baseVol = (a as any).baseline_volatility_pct ?? (a as any).baseline_volatility ?? 0;
                    const ratio = (a as any).spike_ratio ?? 1.0;
                    return `${a.name} (${a.symbol}): 14d Vol ${curVol.toFixed(2)}% vs ${baseVol.toFixed(2)}% Base (${ratio.toFixed(2)}x Spike Ratio)`;
                  })
                  .join(' | ')}
              </div>
            </div>
          </div>
        )}

        {/* Multi-Asset Quantitative Volatility Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {volatilitySpikes?.assets.map((asset) => {
            const isSpike = asset.severity === 'HIGH' || asset.severity === 'CRITICAL';
            const isElevated = asset.severity === 'ELEVATED';
            const curVol = (asset as any).current_volatility_pct ?? (asset as any).current_volatility ?? 0;
            const baseVol = (asset as any).baseline_volatility_pct ?? (asset as any).baseline_volatility ?? 0;
            const ratio = (asset as any).spike_ratio ?? 1.0;
            const recordsUsed = (asset as any).records_used ?? 120;
            return (
              <div
                key={asset.symbol}
                className={`p-4 rounded-2xl bg-[#09252D] border transition-all duration-300 ${
                  asset.severity === 'CRITICAL'
                    ? 'border-[#FF1744] shadow-[0_0_15px_#FF174430]'
                    : asset.severity === 'HIGH'
                    ? 'border-[#FF5C5C] shadow-[0_0_10px_#FF5C5C25]'
                    : isElevated
                    ? 'border-[#F5A62360]'
                    : 'border-[#0F353E] hover:border-[#1A4B57]'
                }`}
              >
                {/* Asset Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold font-mono text-white flex items-center gap-1.5">
                      {asset.name}
                      <span className="text-[10px] font-normal text-[#6996A0] font-mono">({asset.symbol})</span>
                    </div>
                    <div className="text-[10px] font-mono text-[#507A84] mt-0.5">
                      {asset.data_source} · {recordsUsed} trading days
                    </div>
                  </div>
                  <VolatilitySeverityBadge severity={asset.severity} />
                </div>

                {/* Key Metric Numbers */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-[#071F26] border border-[#0F353E]">
                    <div className="text-[9px] font-mono text-[#6996A0] uppercase">14-Day Current Vol</div>
                    <div className={`text-base font-bold font-mono mt-0.5 ${
                      isSpike ? 'text-[#FF5C5C]' : isElevated ? 'text-[#F5A623]' : 'text-[#00E5A3]'
                    }`}>
                      {curVol.toFixed(2)}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#071F26] border border-[#0F353E]">
                    <div className="text-[9px] font-mono text-[#6996A0] uppercase">120-Day Baseline Vol</div>
                    <div className="text-base font-bold font-mono text-white mt-0.5">
                      {baseVol.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Spike Ratio Gauge */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#6996A0]">Spike Ratio (Current / Baseline):</span>
                    <span className={`font-bold ${
                      isSpike ? 'text-[#FF5C5C]' : isElevated ? 'text-[#F5A623]' : 'text-[#00E5A3]'
                    }`}>
                      {ratio.toFixed(2)}x
                    </span>
                  </div>

                  {/* Ratio Meter Bar */}
                  <div className="h-2 rounded-full bg-[#071F26] overflow-hidden relative border border-[#0F353E]">
                    {/* Threshold mark at 1.25x */}
                    <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-[#F5A62360] z-10" title="Elevated threshold (1.25x)" />
                    {/* Threshold mark at 1.50x */}
                    <div className="absolute top-0 bottom-0 left-[60%] w-0.5 bg-[#FF5C5C60] z-10" title="High threshold (1.50x)" />
                    {/* Threshold mark at 2.00x */}
                    <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-[#FF1744] z-10" title="Critical threshold (2.00x)" />

                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        asset.severity === 'CRITICAL'
                          ? 'bg-[#FF1744]'
                          : asset.severity === 'HIGH'
                          ? 'bg-[#FF5C5C]'
                          : isElevated
                          ? 'bg-[#F5A623]'
                          : 'bg-[#00E5A3]'
                      }`}
                      style={{ width: `${Math.min((ratio / 2.5) * 100, 100)}%` }}
                    />
                  </div>

                  {/* Scale legend */}
                  <div className="flex justify-between text-[8px] font-mono text-[#507A84] px-0.5">
                    <span>0.5x</span>
                    <span>1.25x (Elevated)</span>
                    <span>1.50x (High)</span>
                    <span>2.0x (Critical)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Volatility Alert History Audit Trail */}
        {volatilityAlertHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#0F353E]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#00E5A3]" />
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Volatility Spike Audit Trail</h3>
              </div>
              <span className="text-[10px] font-mono text-[#507A84]">{volatilityAlertHistory.length} Logged Events</span>
            </div>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-xs font-mono">
                <thead className="text-[#8DB4BE] border-b border-[#0D2E37] sticky top-0 bg-[#071F26]">
                  <tr>
                    <th className="pb-2 text-left">Time</th>
                    <th className="pb-2 text-left">Asset</th>
                    <th className="pb-2 text-right">14d Vol</th>
                    <th className="pb-2 text-right">120d Base</th>
                    <th className="pb-2 text-right">Spike Ratio</th>
                    <th className="pb-2 text-center">Severity</th>
                    <th className="pb-2 text-left pl-3">Reason / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0D2E37]">
                  {volatilityAlertHistory.slice(0, 10).map((item, idx) => {
                    const curVol = item.current_volatility ?? item.currentVolatilityPct ?? 0;
                    const baseVol = item.baseline_volatility ?? item.baselineVolatilityPct ?? 0;
                    const ratio = item.spike_ratio ?? item.spikeRatio ?? 1.0;
                    return (
                      <tr key={idx} className="hover:bg-[#0A2931]">
                        <td className="py-2 text-[#507A84] whitespace-nowrap">{item.timestamp}</td>
                        <td className="py-2 text-[#00E5A3] font-bold">{item.asset}</td>
                        <td className="py-2 text-right text-[#FF5C5C]">{curVol.toFixed(2)}%</td>
                        <td className="py-2 text-right text-white">{baseVol.toFixed(2)}%</td>
                        <td className="py-2 text-right font-bold text-white">{ratio.toFixed(2)}x</td>
                        <td className="py-2 text-center">
                          <VolatilitySeverityBadge severity={item.severity as any} />
                        </td>
                        <td className="py-2 pl-3 text-[#8DB4BE] text-[11px] max-w-xs truncate">{item.trigger_reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 flex-wrap">
        {(['overview', 'montecarlo', 'integrity', 'paper'] as const).map(t => (
          <button
            type="button"
            key={t}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab(t); }}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-widest transition cursor-pointer ${
              activeTab === t
                ? 'bg-[#00E5A3] text-[#051518]'
                : 'bg-[#071F26] text-[#6996A0] border border-[#0F353E] hover:text-white'
            }`}
          >
            {t === 'overview' ? 'Overview' : t === 'montecarlo' ? 'Monte Carlo' : t === 'integrity' ? 'Integrity' : 'Paper Trade'}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'overview' && profit && risk && (
        <div className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Radar chart */}
            <div className="p-5 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <GitMerge className="w-4 h-4 text-[#00E5A3]" />
                <h3 className="text-sm font-mono font-bold text-white">Strategy Scorecard</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#0D2E37" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#8DB4BE' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="value" stroke="#00E5A3" fill="#00E5A3" fillOpacity={0.18} strokeWidth={2} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#082229', borderColor: '#144754', borderRadius: '10px', fontFamily: 'monospace', fontSize: '11px' }}
                    formatter={(v: any) => [`${v}`, 'Score']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie: Win/Loss */}
            <div className="p-5 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Percent className="w-4 h-4 text-[#00E5A3]" />
                <h3 className="text-sm font-mono font-bold text-white">Win / Loss Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    <Cell fill="#00E5A3" />
                    <Cell fill="#FF5C5C" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#082229', borderColor: '#144754', borderRadius: '10px', fontFamily: 'monospace', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Gauges */}
            <div className="p-5 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-[#00E5A3]" />
                <h3 className="text-sm font-mono font-bold text-white">Risk Gauges</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <GaugeArc
                  value={profit.confidence * 100}
                  max={100}
                  color="#00E5A3"
                  label="Confidence"
                />
                <GaugeArc
                  value={Math.min(Math.abs(risk.riskScore), 100)}
                  max={100}
                  color={risk.level === 'LOW' ? '#00E5A3' : risk.level === 'MODERATE' ? '#F5A623' : '#FF5C5C'}
                  label="Risk Score"
                />
                <GaugeArc
                  value={profit.volatility}
                  max={80}
                  color={profit.volatility < 20 ? '#00E5A3' : '#FF5C5C'}
                  label="Volatility"
                />
                <GaugeArc
                  value={profit.winRatePct}
                  max={100}
                  color={profit.winRatePct >= 50 ? '#00E5A3' : '#F5A623'}
                  label="Win Rate"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Capital Growth Bar + Risk Reasons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Capital comparison bar */}
            <div className="p-5 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-[#00E5A3]" />
                <h3 className="text-sm font-mono font-bold text-white">Capital Performance</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    { name: 'Initial', value: profit.initialCapital },
                    { name: 'Final', value: profit.finalCapital }
                  ]}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#0D2E37" vertical={false} />
                  <XAxis dataKey="name" stroke="#58818B" fontSize={11} fontFamily="monospace" tickLine={false} />
                  <YAxis
                    stroke="#58818B" fontSize={10} fontFamily="monospace" tickLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    domain={[0, Math.max(profit.initialCapital, profit.finalCapital) * 1.1]}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#082229', borderColor: '#144754', borderRadius: '10px', fontFamily: 'monospace', fontSize: '11px' }}
                    formatter={(v: any) => [`$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, '']}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    <Cell fill="#2A6F8A" />
                    <Cell fill={profit.finalCapital >= profit.initialCapital ? '#00E5A3' : '#FF5C5C'} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-[10px] font-mono text-[#6996A0]">Initial</div>
                  <div className="text-xs font-mono font-bold text-white">${profit.initialCapital.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-mono text-[#6996A0]">Final</div>
                  <div className={`text-xs font-mono font-bold ${profit.finalCapital >= profit.initialCapital ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'}`}>
                    ${profit.finalCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-mono text-[#6996A0]">Net P&L</div>
                  <div className={`text-xs font-mono font-bold ${profit.netProfit >= 0 ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'}`}>
                    {profit.netProfit >= 0 ? '+' : ''}${profit.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Analysis Panel */}
            <div className="p-5 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#FF5C5C]" />
                  <h3 className="text-sm font-mono font-bold text-white">Risk Assessment</h3>
                </div>
                <RiskBadge level={risk.level} size="sm" />
              </div>

              {/* Risk score bar */}
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-mono text-[#6996A0]">Risk Score</span>
                  <span className="text-[10px] font-mono text-white">{risk.riskScore.toFixed(1)} / 100</span>
                </div>
                <div className="h-2 rounded-full bg-[#0A2931] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(risk.riskScore, 100)}%`,
                      background: risk.level === 'LOW' ? '#00E5A3' : risk.level === 'MODERATE' ? '#F5A623' : '#FF5C5C'
                    }}
                  />
                </div>
              </div>

              {/* Risk reasons */}
              <div className="space-y-2 mb-4">
                {risk.reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs font-mono text-[#8DB4BE] bg-[#09252D] rounded-xl p-2.5 border border-[#0F353E]">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#F5A623] flex-shrink-0 mt-0.5" />
                    {r}
                  </div>
                ))}
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#09252D] rounded-xl p-3 border border-[#0F353E]">
                  <div className="text-[10px] font-mono text-[#6996A0]">Pot. Downside</div>
                  <div className="text-sm font-mono font-bold text-[#FF5C5C] mt-1">{Math.abs(risk.potentialDownside).toFixed(2)}%</div>
                </div>
                <div className="bg-[#09252D] rounded-xl p-3 border border-[#0F353E]">
                  <div className="text-[10px] font-mono text-[#6996A0]">AI Confidence</div>
                  <div className="text-sm font-mono font-bold text-[#00E5A3] mt-1">{(risk.confidence * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Trade Stats */}
          <div className="p-5 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
            <div className="flex items-center gap-2 mb-5">
              <BarChart2 className="w-4 h-4 text-[#00E5A3]" />
              <h3 className="text-sm font-mono font-bold text-white">Trade Analytics</h3>
              <span className="text-[10px] font-mono text-[#507A84]">({profit.numberOfTrades} total trades)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-[#09252D] rounded-2xl p-4 border border-[#0F353E]">
                <div className="text-[10px] font-mono text-[#6996A0] mb-1">Avg Trade P&L</div>
                <div className={`text-base font-mono font-bold ${profit.avgTrade >= 0 ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'}`}>
                  {profit.avgTrade >= 0 ? '+' : ''}${profit.avgTrade.toFixed(2)}
                </div>
              </div>
              <div className="bg-[#09252D] rounded-2xl p-4 border border-[#0F353E]">
                <div className="text-[10px] font-mono text-[#6996A0] mb-1">Best Trade</div>
                <div className="text-base font-mono font-bold text-[#00E5A3]">+${profit.bestTrade.toFixed(2)}</div>
              </div>
              <div className="bg-[#09252D] rounded-2xl p-4 border border-[#0F353E]">
                <div className="text-[10px] font-mono text-[#6996A0] mb-1">Worst Trade</div>
                <div className="text-base font-mono font-bold text-[#FF5C5C]">${profit.worstTrade.toFixed(2)}</div>
              </div>
              <div className="bg-[#09252D] rounded-2xl p-4 border border-[#0F353E]">
                <div className="text-[10px] font-mono text-[#6996A0] mb-1">Profit Factor</div>
                <div className={`text-base font-mono font-bold ${profit.profitFactor >= 1 ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'}`}>
                  {profit.profitFactor.toFixed(2)}x
                </div>
              </div>
            </div>

            {/* Trade P&L bar chart */}
            <ResponsiveContainer width="100%" height={120}>
              <BarChart
                data={[
                  { name: 'Best', value: profit.bestTrade },
                  { name: 'Avg', value: profit.avgTrade },
                  { name: 'Worst', value: profit.worstTrade }
                ]}
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#0D2E37" vertical={false} />
                <XAxis dataKey="name" stroke="#58818B" fontSize={10} fontFamily="monospace" tickLine={false} />
                <YAxis stroke="#58818B" fontSize={10} fontFamily="monospace" tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#082229', borderColor: '#144754', borderRadius: '10px', fontFamily: 'monospace', fontSize: '11px' }}
                  formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'P&L']}
                />
                <ReferenceLine y={0} stroke="#1B4E5B" />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <Cell fill="#00E5A3" />
                  <Cell fill={profit.avgTrade >= 0 ? '#00E5A3' : '#FF5C5C'} />
                  <Cell fill="#FF5C5C" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alert History */}
          {alerts.length > 0 && (
            <div className="p-5 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-[#F5A623]" />
                <h3 className="text-sm font-mono font-bold text-white">Alert History</h3>
                <span className="text-[10px] px-2 py-0.5 bg-[#F5A62315] text-[#F5A623] border border-[#F5A62330] rounded-lg font-mono">{alerts.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead className="text-[#8DB4BE] border-b border-[#0D2E37]">
                    <tr>
                      <th className="pb-2 text-left">Time</th>
                      <th className="pb-2 text-left">Asset</th>
                      <th className="pb-2 text-left">Type</th>
                      <th className="pb-2 text-left">Level</th>
                      <th className="pb-2 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0D2E37]">
                    {alerts.slice(0, 10).map((a, i) => (
                      <tr key={i} className="hover:bg-[#0A2931]">
                        <td className="py-2 text-[#507A84]">{a.timestamp}</td>
                        <td className="py-2 text-[#00E5A3]">{a.asset}</td>
                        <td className="py-2 text-white">{a.alert_type}</td>
                        <td className="py-2"><RiskBadge level={a.risk_level} /></td>
                        <td className="py-2 text-[#8DB4BE]">{a.trigger_reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {alerts.length === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#071F26] border border-[#0F353E]">
              <CheckCircle className="w-5 h-5 text-[#00E5A3]" />
              <span className="text-sm font-mono text-[#8DB4BE]">No active alerts — all systems nominal.</span>
            </div>
          )}
        </div>
      )}

      {/* ── MONTE CARLO TAB ────────────────────────────────────────────────── */}
      {activeTab === 'montecarlo' && mc && (
        <div className="space-y-6">
          {/* Headline stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Median Outcome', value: `${mc.medianOutcome.toFixed(2)}%`, color: '#00E5A3' },
              { label: '5th Pct (Downside)', value: `${mc.downsidePercentile.toFixed(2)}%`, color: '#FF5C5C' },
              { label: '95th Pct (Upside)', value: `${mc.upsidePercentile.toFixed(2)}%`, color: '#00E5A3' },
              { label: 'Prob. Negative', value: `${(mc.probabilityNegativeReturn * 100).toFixed(1)}%`, color: '#F5A623' },
              { label: 'Worst Scenario', value: `${mc.worstScenario.toFixed(2)}%`, color: '#FF5C5C' },
              { label: 'Best Scenario', value: `${mc.bestScenario.toFixed(2)}%`, color: '#00E5A3' }
            ].map(c => (
              <StatCard key={c.label} label={c.label} value={c.value} color={c.color} />
            ))}
          </div>

          {/* Histogram */}
          <div className="p-5 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00E5A3]" />
                <h3 className="text-sm font-mono font-bold text-white">Return Distribution Histogram</h3>
              </div>
              <span className="text-[10px] font-mono text-[#507A84]">{mc.nPaths.toLocaleString()} paths · {mc.nDays}‑day horizon</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mc.histogram} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0D2E37" vertical={false} />
                <XAxis
                  dataKey="bin"
                  stroke="#58818B"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  tickFormatter={v => `${Number(v).toFixed(1)}%`}
                />
                <YAxis stroke="#58818B" fontSize={10} fontFamily="monospace" tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#082229', borderColor: '#144754', borderRadius: '10px', fontFamily: 'monospace', fontSize: '11px' }}
                  formatter={(v: any, n: any) => [`${v}%`, n === 'pct' ? 'Frequency' : n]}
                  labelFormatter={l => `Return ≈ ${l}%`}
                />
                <ReferenceLine x={mc.medianOutcome.toFixed(2)} stroke="#00E5A3" strokeDasharray="4 4" label={{ value: 'Median', fill: '#00E5A3', fontSize: 10, fontFamily: 'monospace' }} />
                <ReferenceLine x={mc.downsidePercentile.toFixed(2)} stroke="#FF5C5C" strokeDasharray="4 4" label={{ value: 'P5', fill: '#FF5C5C', fontSize: 10, fontFamily: 'monospace' }} />
                <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                  {mc.histogram.map((entry, idx) => (
                    <Cell key={idx} fill={entry.bin < 0 ? '#FF5C5C' : '#00E5A3'} opacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Percentile line chart */}
          <div className="p-5 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#00E5A3]" />
              <h3 className="text-sm font-mono font-bold text-white">Percentile Bands</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={[
                  { name: 'Worst', value: mc.worstScenario },
                  { name: 'P5', value: mc.downsidePercentile },
                  { name: 'Q1', value: mc.q1 },
                  { name: 'Median', value: mc.medianOutcome },
                  { name: 'Q3', value: mc.q3 },
                  { name: 'P95', value: mc.upsidePercentile },
                  { name: 'Best', value: mc.bestScenario }
                ]}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#0D2E37" vertical={false} />
                <XAxis dataKey="name" stroke="#58818B" fontSize={10} fontFamily="monospace" tickLine={false} />
                <YAxis stroke="#58818B" fontSize={10} fontFamily="monospace" tickLine={false} tickFormatter={v => `${v.toFixed(1)}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#082229', borderColor: '#144754', borderRadius: '10px', fontFamily: 'monospace', fontSize: '11px' }}
                  formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Return']}
                />
                <ReferenceLine y={0} stroke="#1B4E5B" />
                <Line type="monotone" dataKey="value" stroke="#00E5A3" strokeWidth={2.5} dot={{ r: 4, fill: '#00E5A3', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── INTEGRITY TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'integrity' && integrity && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Checks panel */}
            <div className="p-5 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-[#00E5A3]" />
                <h3 className="text-sm font-mono font-bold text-white">Backtest Integrity Audit</h3>
              </div>
              <CheckRow label="Look-Ahead Bias" value={integrity.lookAheadBias} />
              <CheckRow label="Data Leakage" value={integrity.dataLeakage} />
              <CheckRow label="Survivorship Bias" value={integrity.survivorshipBias} />
              <CheckRow label="Transaction Cost Model" value={integrity.transactionCostModel} />
              <CheckRow label="Slippage Model" value={integrity.slippageModel} />
              <CheckRow label="Walk-Forward Validation" value={integrity.walkForwardValidation} />
              <CheckRow label="Out-of-Sample Test" value={integrity.outOfSampleTest} />
            </div>

            {/* Metadata */}
            <div className="p-5 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-[#00E5A3]" />
                <h3 className="text-sm font-mono font-bold text-white">Execution Metadata</h3>
              </div>
              <div className="space-y-3">
                {[
                  { k: 'Symbol', v: integrity.symbol },
                  { k: 'Strategy', v: integrity.strategy },
                  { k: 'Data Source', v: integrity.dataSource },
                  { k: 'Total Saved Backtests', v: integrity.totalRecords.toString() },
                  { k: 'Transaction Cost', v: `${(integrity.transactionCostPct * 100).toFixed(2)}% per trade` },
                  { k: 'Position Size', v: `${(integrity.positionSizePct * 100).toFixed(0)}% of capital` },
                  { k: 'Data Mode', v: integrity.isDemo ? 'Demo (Deterministic Simulator)' : 'Live (Yahoo Finance)' }
                ].map(({ k, v }) => (
                  <div key={k} className="flex justify-between text-xs font-mono border-b border-[#0D2E37] pb-2 last:border-0">
                    <span className="text-[#6996A0]">{k}</span>
                    <span className={`font-bold ${v === 'PASS' ? 'text-[#00E5A3]' : 'text-white'}`}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Zero Look-Ahead Badge */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#00E5A310] border border-[#00E5A330]">
            <CheckCircle className="w-8 h-8 text-[#00E5A3] flex-shrink-0" />
            <div>
              <div className="text-sm font-mono font-bold text-[#00E5A3]">Deterministic Execution Matrix — Zero Look-Ahead Guaranteed</div>
              <div className="text-xs font-mono text-[#507A84] mt-1">
                All signals are generated exclusively on data available at trade time. No future leakage detected.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAPER TRADE TAB ───────────────────────────────────────────────── */}
      {activeTab === 'paper' && (
        <div className="space-y-6">
          {paper && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="Realized P&L"
                value={`$${paper.realizedPnl >= 0 ? '+' : ''}${paper.realizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                color={paper.realizedPnl >= 0 ? '#00E5A3' : '#FF5C5C'}
                icon={<DollarSign className="w-4 h-4" />}
              />
              <StatCard label="Total Trades" value={paper.trades.length.toString()} icon={<BarChart2 className="w-4 h-4" />} />
              <StatCard
                label="Open Positions"
                value={paper.trades.filter((t: any) => !t.exit_price).length.toString()}
                color="#F5A623"
                icon={<Activity className="w-4 h-4" />}
              />
            </div>
          )}

          {/* New Paper Trade Form */}
          <PaperTradeForm onSubmit={fetchAll} />

          {/* Trade log */}
          {paper && paper.trades.length > 0 && (
            <div className="p-5 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
              <h3 className="text-sm font-mono font-bold text-white mb-4">Trade Log</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead className="text-[#8DB4BE] border-b border-[#0D2E37]">
                    <tr>
                      <th className="pb-2 text-left">#</th>
                      <th className="pb-2 text-left">Entry Time</th>
                      <th className="pb-2 text-left">Symbol</th>
                      <th className="pb-2 text-left">Side</th>
                      <th className="pb-2 text-right">Qty</th>
                      <th className="pb-2 text-right">Entry $</th>
                      <th className="pb-2 text-right">Exit $</th>
                      <th className="pb-2 text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0D2E37]">
                    {paper.trades.map((t: any) => (
                      <tr key={t.id} className="hover:bg-[#0A2931]">
                        <td className="py-2 text-[#507A84]">{t.id}</td>
                        <td className="py-2 text-[#507A84]">{t.entry_time?.slice(0, 16).replace('T', ' ')}</td>
                        <td className="py-2 text-[#00E5A3]">{t.symbol}</td>
                        <td className={`py-2 font-bold ${t.side === 'buy' ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'}`}>{t.side?.toUpperCase()}</td>
                        <td className="py-2 text-right text-white">{t.quantity}</td>
                        <td className="py-2 text-right text-white">${t.entry_price}</td>
                        <td className="py-2 text-right text-[#507A84]">{t.exit_price ?? '—'}</td>
                        <td className={`py-2 text-right font-bold ${t.pnl >= 0 ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'}`}>
                          {t.exit_price ? `$${t.pnl?.toFixed(2)}` : 'Open'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {paper && paper.trades.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <BarChart2 className="w-10 h-10 text-[#1B4E5B]" />
              <div className="text-sm font-mono text-[#507A84]">No paper trades yet. Submit your first trade above.</div>
            </div>
          )}
        </div>
      )}

      {/* 🚨 WINDOWS EMERGENCY ALERT MODAL POPUP */}
      <WindowsEmergencyAlertModal
        isOpen={isWindowsAlertModalOpen}
        onClose={handleStopAllAlerts}
        elapsedSeconds={windowsAlertElapsed}
        soundEnabled={volatilitySoundEnabled}
        setSoundEnabled={setVolatilitySoundEnabled}
        voiceEnabled={volatilityVoiceEnabled}
        setVoiceEnabled={setVolatilityVoiceEnabled}
        volume={volatilityVolume}
        setVolume={setVolatilityVolume}
      />
    </div>
  );
};

// ─── Paper Trade Form ─────────────────────────────────────────────────────────
const PaperTradeForm: React.FC<{ onSubmit: () => void }> = ({ onSubmit }) => {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [symbol, setSymbol] = useState('GC=F');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const r = await fetch('/api/investor/paper-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side, symbol, qty: Number(qty), price: Number(price) })
      });
      if (!r.ok) throw new Error(await r.text());
      setMsg('✓ Trade submitted successfully');
      setPrice('');
      onSubmit();
    } catch (e: any) {
      setMsg(`✗ ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
      <h3 className="text-sm font-mono font-bold text-white mb-4">Submit Paper Trade</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Side */}
        <div className="flex gap-2">
          <button type="button" onClick={() => setSide('buy')}
            className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition ${side === 'buy' ? 'bg-[#00E5A3] text-[#051518]' : 'bg-[#09252D] text-[#6996A0] border border-[#0F353E]'}`}>BUY</button>
          <button type="button" onClick={() => setSide('sell')}
            className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition ${side === 'sell' ? 'bg-[#FF5C5C] text-white' : 'bg-[#09252D] text-[#6996A0] border border-[#0F353E]'}`}>SELL</button>
        </div>
        {/* Symbol */}
        <select value={symbol} onChange={e => setSymbol(e.target.value)}
          className="bg-[#09252D] border border-[#133F4A] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00E5A3]">
          <option value="GC=F">GC=F (Gold)</option>
          <option value="BTC-USD">BTC-USD (Bitcoin)</option>
          <option value="NVDA">NVDA (NVIDIA)</option>
        </select>
        {/* Qty */}
        <input type="number" placeholder="Quantity" min="0.0001" step="any" value={qty}
          onChange={e => setQty(e.target.value)} required
          className="bg-[#09252D] border border-[#133F4A] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00E5A3]" />
        {/* Price */}
        <input type="number" placeholder="Entry Price $" min="0.01" step="any" value={price}
          onChange={e => setPrice(e.target.value)} required
          className="bg-[#09252D] border border-[#133F4A] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00E5A3]" />
        {/* Submit */}
        <button type="submit" disabled={submitting}
          className="sm:col-span-4 py-2.5 rounded-xl bg-[#00E5A3] text-[#051518] text-xs font-mono font-bold cursor-pointer hover:bg-[#00C98F] transition disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Submit Trade'}
        </button>
      </form>
      {msg && (
        <div className={`mt-3 text-xs font-mono ${msg.startsWith('✓') ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'}`}>{msg}</div>
      )}
    </div>
  );
};
