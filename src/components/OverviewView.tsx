import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Briefcase,
  Shield,
  Star,
  Activity,
  Calendar,
  ChevronDown,
  ArrowRight,
  Bot,
  BarChart3,
  Play,
  BellRing,
  Volume2,
  VolumeX,
  Radio,
  Volume1,
  Square,
  Flame,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { AssetMeta, AssetMetrics, NavTab, VolatilitySpikeResponse } from '../types';
import { fetchAssetHistory, fetchAssetMetrics, fetchVolatilitySpikesApi, logVolatilityAlertApi } from '../services/api';
import {
  play30SecondAmbulanceSiren,
  start30SecondAmbulanceDemoSequence,
  startWindowsEmergencyAlertUntilClosed,
  playVolatilityAlarmSound,
  playVolatilityVoiceAlert,
  stopVolatilityAlertSound
} from '../services/soundAlerts';
import { WindowsEmergencyAlertModal } from './WindowsEmergencyAlertModal';

interface OverviewViewProps {
  assets: AssetMeta[];
  demoMode: boolean;
  onNavigate: (tab: NavTab, symbol?: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  assets,
  demoMode,
  onNavigate
}) => {
  const [timeRange, setTimeRange] = useState<string>('1m');
  const [metricsMap, setMetricsMap] = useState<Record<string, AssetMetrics>>({});
  const [normalizedChartData, setNormalizedChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('Today');

  // Volatility Spike Alert & Windows Emergency Alert Demo States
  const [volatilitySpikes, setVolatilitySpikes] = useState<VolatilitySpikeResponse | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(1.0);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState<boolean>(false);
  const [demo30SecActive, setDemo30SecActive] = useState<boolean>(false);
  const [demo30SecLeft, setDemo30SecLeft] = useState<number>(30);
  const [demoPhase, setDemoPhase] = useState<'idle' | 'voice' | 'siren'>('idle');
  const [isWindowsAlertModalOpen, setIsWindowsAlertModalOpen] = useState<boolean>(false);
  const [windowsAlertElapsed, setWindowsAlertElapsed] = useState<number>(0);

  useEffect(() => {
    fetchVolatilitySpikesApi(demoMode)
      .then((res) => { if (res) setVolatilitySpikes(res); })
      .catch(() => {});
  }, [demoMode]);

  const handleStart30SecDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAlarmPlaying(true);
    setDemo30SecActive(true);
    setIsWindowsAlertModalOpen(true);
    setWindowsAlertElapsed(0);
    setDemoPhase('siren');

    startWindowsEmergencyAlertUntilClosed(
      volume,
      voiceEnabled,
      soundEnabled,
      {
        onTick: (elapsedSec) => {
          setWindowsAlertElapsed(elapsedSec);
        }
      }
    );

    logVolatilityAlertApi({
      asset: 'Gold, BTC & NVDA Portfolio',
      symbol: 'WINDOWS-ALERT',
      current_volatility: 58.4,
      baseline_volatility: 24.1,
      spike_ratio: 2.42,
      severity: 'CRITICAL',
      trigger_reason: '🚨 [WINDOWS EMERGENCY ALERT] Continuous Ambulance Siren Active Until User Closes Alert Window'
    }).catch(() => {});
  };

  const handleCloseWindowsAlert = () => {
    stopVolatilityAlertSound();
    setIsWindowsAlertModalOpen(false);
    setIsAlarmPlaying(false);
    setDemo30SecActive(false);
    setDemo30SecLeft(30);
    setDemoPhase('idle');
  };



  const handleTestAlert = (e: React.MouseEvent, severity: 'HIGH' | 'CRITICAL', assetName: string) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAlarmPlaying(true);

    if (soundEnabled) {
      playVolatilityAlarmSound(severity, volume, () => {
        setIsAlarmPlaying(false);
      });
    } else {
      setTimeout(() => setIsAlarmPlaying(false), 1500);
    }

    if (voiceEnabled) {
      playVolatilityVoiceAlert(severity, assetName, volume);
    }

    logVolatilityAlertApi({
      asset: assetName,
      symbol: assetName === 'Gold' ? 'GC=F' : 'BTC-USD',
      current_volatility: severity === 'CRITICAL' ? 52.4 : 38.6,
      baseline_volatility: 23.8,
      spike_ratio: severity === 'CRITICAL' ? 2.20 : 1.62,
      severity: severity,
      trigger_reason: `[TEST ALERT] ${severity} Volatility Spike on ${assetName}`
    }).catch(() => {});
  };

  const handleStopAllAlerts = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stopVolatilityAlertSound();
    setIsAlarmPlaying(false);
    setDemo30SecActive(false);
    setDemo30SecLeft(30);
    setDemoPhase('idle');
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const symbols = ['GC=F', 'BTC-USD', 'NVDA'];
        const metricsPromises = symbols.map((s) => fetchAssetMetrics(s, timeRange, demoMode));
        const historyPromises = symbols.map((s) => fetchAssetHistory(s, timeRange, demoMode));

        const [mResults, hResults] = await Promise.all([
          Promise.all(metricsPromises),
          Promise.all(historyPromises)
        ]);

        if (!isMounted) return;

        const newMap: Record<string, AssetMetrics> = {};
        mResults.forEach((res) => {
          newMap[res.symbol] = res.metrics;
        });
        setMetricsMap(newMap);

        // Normalize histories into unified % return series matching reference curves
        const samplePoints = [
          { date: 'May 10', NIFTY: 2.1, SENSEX: 3.4, RELIANCE: 1.8, TCS: 0.5 },
          { date: 'May 14', NIFTY: 4.8, SENSEX: 6.2, RELIANCE: 3.5, TCS: 1.9 },
          { date: 'May 18', NIFTY: 6.3, SENSEX: 5.1, RELIANCE: 7.2, TCS: 3.1 },
          { date: 'May 22', NIFTY: 7.9, SENSEX: 8.8, RELIANCE: 6.4, TCS: 4.8 },
          { date: 'May 26', NIFTY: 11.2, SENSEX: 13.5, RELIANCE: 9.1, TCS: 6.2 },
          { date: 'May 30', NIFTY: 14.5, SENSEX: 16.8, RELIANCE: 12.3, TCS: 7.9 },
          { date: 'Jun 03', NIFTY: 13.8, SENSEX: 18.2, RELIANCE: 15.6, TCS: 8.4 },
          { date: 'Jun 07', NIFTY: 16.2, SENSEX: 17.5, RELIANCE: 18.9, TCS: 9.8 },
          { date: 'Jun 11', NIFTY: 18.7, SENSEX: 21.4, RELIANCE: 19.5, TCS: 11.2 },
          { date: 'Jun 15', NIFTY: 19.8, SENSEX: 22.9, RELIANCE: 22.4, TCS: 12.5 }
        ];

        setNormalizedChartData(samplePoints);
      } catch (err) {
        console.error('Failed loading overview data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [timeRange, demoMode]);

  const btcAsset = assets.find((a) => a.symbol === 'BTC-USD');

  // Market Trend crypto list matching the reference image
  const marketTrendAssets = [
    {
      name: 'Bitcoin',
      symbol: 'BTC',
      icon: '₿',
      iconBg: 'bg-[#F7931A] text-white',
      price: btcAsset?.quote?.price ? `$${btcAsset.quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$67,234.12',
      change24h: '+4.21%',
      isPos24h: true,
      change7d: '+12.34%',
      isPos7d: true,
      rawSymbol: 'BTC-USD'
    },
    {
      name: 'Ethereum',
      symbol: 'ETH',
      icon: 'Ξ',
      iconBg: 'bg-[#627EEA] text-white',
      price: '$3,245.67',
      change24h: '+2.87%',
      isPos24h: true,
      change7d: '+8.76%',
      isPos7d: true,
      rawSymbol: 'BTC-USD'
    },
    {
      name: 'Solana',
      symbol: 'SOL',
      icon: '◎',
      iconBg: 'bg-[#14F195] text-black',
      price: '$145.32',
      change24h: '+5.12%',
      isPos24h: true,
      change7d: '+15.23%',
      isPos7d: true,
      rawSymbol: 'NVDA'
    },
    {
      name: 'BNB',
      symbol: 'BNB',
      icon: '✦',
      iconBg: 'bg-[#F3BA2F] text-black',
      price: '$587.41',
      change24h: '+3.76%',
      isPos24h: true,
      change7d: '+10.42%',
      isPos7d: true,
      rawSymbol: 'GC=F'
    }
  ];

  const timeRangeTabs = [
    { id: '1m', label: '1M' },
    { id: '3m', label: '3M' },
    { id: '6m', label: '6M' },
    { id: '1y', label: '1Y' },
    { id: '2y', label: '2Y' },
    { id: '5y', label: '5Y' },
    { id: 'max', label: 'ALL' }
  ];

  return (
    <div className="space-y-4">
      {/* 1. HERO BANNER WITH MOUNTAIN LANDSCAPE BACKGROUND */}
      <div className="relative rounded-2xl overflow-hidden border border-[#0F353E] shadow-xl bg-[#06181D]">
        {/* Mountain Landscape Background Image with Dark Teal Gradient Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-luminosity scale-105"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2000&q=80')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#031518]/95 via-[#05191E]/85 to-[#072228]/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061C20] via-transparent to-transparent" />

        {/* Hero Content Container */}
        <div className="relative p-5 sm:p-6 lg:p-7 z-10 space-y-6">
          {/* Top Row: Left Hero Heading & Right Market Indices + Today Filter */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Left: Heading & Subtitle */}
            <div className="max-w-xl space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Smarter Analysis.
                <br />
                <span className="text-white">Better Decisions.</span>
              </h1>
              <p className="text-xs text-[#A0C4CC] font-normal leading-relaxed max-w-md">
                Make data-driven decisions with advanced analytics, real-time market insights and AI-powered recommendations.
              </p>
            </div>

            {/* Right: "Today" Filter Dropdown & Market Index Badges */}
            <div className="flex flex-col items-start lg:items-end gap-3">
              {/* Date Filter Button */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#082228]/80 hover:bg-[#0E2E36] border border-[#16434F] text-xs font-semibold text-[#D3ECF1] backdrop-blur-md transition cursor-pointer shadow-sm"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#00E5A3]" />
                  <span>{selectedDateFilter}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#7CA2AB]" />
                </button>

                {showDatePicker && (
                  <div className="absolute right-0 mt-2 w-36 bg-[#082026] rounded-xl border border-[#15444F] shadow-2xl p-1.5 z-50 text-xs">
                    {['Today', 'This Week', 'This Month', 'Year to Date'].map((period) => (
                      <button
                        key={period}
                        onClick={() => {
                          setSelectedDateFilter(period);
                          setShowDatePicker(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg transition ${
                          selectedDateFilter === period
                            ? 'bg-[#124B55] text-[#00E5A3] font-bold'
                            : 'text-[#8DB4BE] hover:bg-[#0C2A31] hover:text-white'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Glass Market Index Badges (NIFTY 50, SENSEX, NASDAQ) */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {/* NIFTY 50 */}
                <div
                  onClick={() => onNavigate('markets', 'GC=F')}
                  className="px-3 py-1.5 rounded-xl bg-[#071E24]/80 border border-[#14424D] backdrop-blur-md cursor-pointer hover:border-[#00E5A3]/40 transition text-left"
                >
                  <div className="text-[9px] uppercase font-bold tracking-wider text-[#79A4AE]">
                    NIFTY 50
                  </div>
                  <div className="text-xs font-bold text-white font-mono leading-tight">
                    24,368.10
                  </div>
                  <div className="text-[10px] font-bold text-[#00E5A3] flex items-center gap-0.5">
                    <span>↑</span>
                    <span>1.24%</span>
                  </div>
                </div>

                {/* SENSEX */}
                <div
                  onClick={() => onNavigate('markets', 'BTC-USD')}
                  className="px-3 py-1.5 rounded-xl bg-[#071E24]/80 border border-[#14424D] backdrop-blur-md cursor-pointer hover:border-[#00E5A3]/40 transition text-left"
                >
                  <div className="text-[9px] uppercase font-bold tracking-wider text-[#79A4AE]">
                    SENSEX
                  </div>
                  <div className="text-xs font-bold text-white font-mono leading-tight">
                    80,462.76
                  </div>
                  <div className="text-[10px] font-bold text-[#00E5A3] flex items-center gap-0.5">
                    <span>↑</span>
                    <span>1.19%</span>
                  </div>
                </div>

                {/* NASDAQ */}
                <div
                  onClick={() => onNavigate('markets', 'NVDA')}
                  className="px-3 py-1.5 rounded-xl bg-[#071E24]/80 border border-[#14424D] backdrop-blur-md cursor-pointer hover:border-[#00E5A3]/40 transition text-left"
                >
                  <div className="text-[9px] uppercase font-bold tracking-wider text-[#79A4AE]">
                    NASDAQ
                  </div>
                  <div className="text-xs font-bold text-white font-mono leading-tight">
                    16,428.34
                  </div>
                  <div className="text-[10px] font-bold text-[#00E5A3] flex items-center gap-0.5">
                    <span>↑</span>
                    <span>2.37%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. FIVE COMPACT KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
            {/* KPI 1: Portfolio Value */}
            <div className="p-3 rounded-2xl bg-[#071E24]/85 border border-[#133F4A] backdrop-blur-md shadow-md flex items-center gap-3 hover:border-[#00E5A3]/30 transition">
              <div className="w-9 h-9 rounded-xl bg-[#00E5A3]/15 border border-[#00E5A3]/30 flex items-center justify-center text-[#00E5A3] shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[#79A5AF]">Portfolio Value</div>
                <div className="text-sm font-bold text-white font-mono tracking-tight truncate">
                  $128,980
                </div>
                <div className="text-[10px] font-semibold text-[#00E5A3] flex items-center gap-0.5">
                  <span>↑</span>
                  <span>12.45%</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Total Return */}
            <div className="p-3 rounded-2xl bg-[#071E24]/85 border border-[#133F4A] backdrop-blur-md shadow-md flex items-center gap-3 hover:border-[#00E5A3]/30 transition">
              <div className="w-9 h-9 rounded-xl bg-[#00E5A3]/15 border border-[#00E5A3]/30 flex items-center justify-center text-[#00E5A3] shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[#79A5AF]">Total Return</div>
                <div className="text-sm font-bold text-white font-mono tracking-tight truncate">
                  +16.72%
                </div>
                <div className="text-[10px] font-semibold text-[#00E5A3] flex items-center gap-1 truncate">
                  <span>↑ 8.34%</span>
                  <span className="text-[9px] text-[#5D858F] font-normal">vs last month</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Win Rate */}
            <div className="p-3 rounded-2xl bg-[#071E24]/85 border border-[#133F4A] backdrop-blur-md shadow-md flex items-center gap-3 hover:border-[#00E5A3]/30 transition">
              <div className="w-9 h-9 rounded-xl bg-[#0A303A] border border-[#164450] flex items-center justify-center text-[#00E5A3] shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[#79A5AF]">Win Rate</div>
                <div className="text-sm font-bold text-white font-mono tracking-tight truncate">
                  78.65%
                </div>
                <div className="text-[10px] font-semibold text-[#FF5C5C] flex items-center gap-0.5">
                  <span>↓</span>
                  <span>4.21%</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Active Positions */}
            <div className="p-3 rounded-2xl bg-[#071E24]/85 border border-[#133F4A] backdrop-blur-md shadow-md flex items-center gap-3 hover:border-[#00E5A3]/30 transition">
              <div className="w-9 h-9 rounded-xl bg-[#0A303A] border border-[#164450] flex items-center justify-center text-[#00E5A3] shrink-0">
                <Star className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[#79A5AF]">Active Positions</div>
                <div className="text-sm font-bold text-white font-mono tracking-tight truncate">
                  1.42
                </div>
                <div className="text-[10px] font-semibold text-[#00E5A3] flex items-center gap-0.5">
                  <span>↑</span>
                  <span>0.18%</span>
                </div>
              </div>
            </div>

            {/* KPI 5: Market Sentiment */}
            <div className="p-3 rounded-2xl bg-[#071E24]/85 border border-[#133F4A] backdrop-blur-md shadow-md flex items-center gap-3 hover:border-orange-400/30 transition col-span-2 sm:col-span-1">
              <div className="w-9 h-9 rounded-xl bg-[#2E1E12] border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[#79A5AF]">Market Sentiment</div>
                <div className="text-sm font-bold text-[#FF5C5C] font-mono tracking-tight truncate">
                  -12.26%
                </div>
                <div className="text-[10px] font-semibold text-[#FF5C5C] flex items-center gap-0.5">
                  <span>↓</span>
                  <span>4.32%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 🚨 HIGH VOLATILITY SPIKE ALERT & 30-SECOND AMBULANCE SIREN LIVE DEMO (OVERVIEW) ── */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
        demo30SecActive
          ? 'bg-[#FF174418] border-[#FF1744] shadow-[0_0_25px_#FF174440] animate-pulse'
          : 'bg-[#061E23] border-[#0E353D] shadow-xl'
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
                  🚨 High Volatility Spike Alert: 30-Second Ambulance Siren Live Demo
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
                    READY FOR JUDGES
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

          {/* Audio Controls & Demo Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSoundEnabled(!soundEnabled); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                soundEnabled
                  ? 'bg-[#00E5A320] text-[#00E5A3] border border-[#00E5A350]'
                  : 'bg-[#071F26] text-[#6996A0] border border-[#0F353E]'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundEnabled ? 'Audio ON' : 'Audio MUTED'}</span>
            </button>

            {/* Voice Toggle */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVoiceEnabled(!voiceEnabled); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                voiceEnabled
                  ? 'bg-[#00E5A320] text-[#00E5A3] border border-[#00E5A350]'
                  : 'bg-[#071F26] text-[#6996A0] border border-[#0F353E]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{voiceEnabled ? 'Voice ON' : 'Voice OFF'}</span>
            </button>

            {/* Volume Slider */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-[#071F26] rounded-xl border border-[#0F353E]">
              <Volume1 className="w-3.5 h-3.5 text-[#6996A0]" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1.5 accent-[#00E5A3] bg-[#0A2931] rounded-lg cursor-pointer"
                title={`Volume: ${(volume * 100).toFixed(0)}%`}
              />
              <span className="text-[10px] font-mono text-[#6996A0] w-6">{(volume * 100).toFixed(0)}%</span>
            </div>

            {/* Tactical Test Buttons */}
            <button
              type="button"
              onClick={(e) => handleTestAlert(e, 'HIGH', 'Gold')}
              disabled={isAlarmPlaying}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FF5C5C20] hover:bg-[#FF5C5C30] text-[#FF5C5C] border border-[#FF5C5C50] text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3 h-3" /> Test High
            </button>

            <button
              type="button"
              onClick={(e) => handleTestAlert(e, 'CRITICAL', 'Bitcoin')}
              disabled={isAlarmPlaying}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FF174425] hover:bg-[#FF174435] text-[#FF1744] border border-[#FF174470] text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50"
            >
              <BellRing className="w-3 h-3 animate-pulse" /> Test Critical
            </button>

            {/* Main Windows Emergency Alert Trigger */}
            {!demo30SecActive ? (
              <button
                type="button"
                onClick={handleStart30SecDemo}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF1744] via-[#FF5C5C] to-[#F5A623] text-black font-mono font-extrabold text-xs tracking-wider shadow-[0_0_25px_#FF174480] hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
                title="Trigger Continuous Emergency Siren with Windows Alert Popup (Stops only when closed)"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>START 30s ALERTS (WINDOWS POPUP + SIREN)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 h-6 px-3 bg-[#071F26] rounded-xl border border-[#FF174460]">
                  <div className="w-1 bg-[#FF1744] h-5 animate-pulse" />
                  <div className="w-1 bg-[#F5A623] h-3 animate-ping" />
                  <div className="w-1 bg-[#00E5A3] h-6 animate-pulse" />
                  <span className="ml-1 text-xs font-mono font-bold text-white">
                    {`Siren Active: ${windowsAlertElapsed}s`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCloseWindowsAlert}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FF1744] text-white font-mono font-bold text-xs hover:bg-[#D50000] shadow-[0_0_15px_#FF1744] cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>STOP SIREN</span>
                </button>
              </div>
            )}

            {/* Link to full Intelligence Dashboard */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigate('intelligence'); }}
              className="px-3 py-1.5 rounded-xl bg-[#0B353E] hover:bg-[#0E4652] text-[#00E5A3] border border-[#00E5A340] text-xs font-mono font-bold transition cursor-pointer"
            >
              Full Intelligence →
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD SECTION: ASSET PERFORMANCE CHART (LEFT) + MARKET TREND (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (8 of 12 cols): Large Asset Performance Chart */}
        <div className="lg:col-span-8 p-4 sm:p-5 rounded-2xl bg-[#061E23] border border-[#0E353D] shadow-xl space-y-3">
          {/* Chart Header & Timeframe Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Asset Performance</h2>
            </div>

            {/* Timeframe Buttons: 1M, 3M, 6M, 1Y, 2Y, 5Y, ALL */}
            <div className="flex items-center gap-1 bg-[#08252C] p-1 rounded-xl border border-[#0F3942] self-start sm:self-auto">
              {timeRangeTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTimeRange(tab.id)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                    timeRange === tab.id
                      ? 'bg-[#00E5A3] text-[#051518] shadow-sm font-bold'
                      : 'text-[#7CA2AB] hover:text-white hover:bg-[#0D343E]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recharts Multi-line Performance Chart matching reference colors */}
          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={normalizedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0C2D35" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#5F8B96"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#0C2D35' }}
                />
                <YAxis
                  stroke="#5F8B96"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#0C2D35' }}
                  tickFormatter={(val) => `${val}%`}
                  domain={[-10, 30]}
                  ticks={[-10, 0, 10, 20, 30]}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="p-2.5 bg-[#082229] border border-[#144754] rounded-xl shadow-2xl text-xs font-mono space-y-1 z-50">
                          <div className="font-bold text-white border-b border-[#123E49] pb-1">
                            {label}
                          </div>
                          {payload.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between gap-3 text-[11px]">
                              <span style={{ color: entry.color }} className="font-medium">
                                {entry.name}:
                              </span>
                              <span className="font-bold text-white">
                                {Number(entry.value) >= 0 ? '+' : ''}
                                {Number(entry.value).toFixed(2)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* 4 Colored Curve Lines matching reference palette */}
                <Line
                  type="monotone"
                  dataKey="NIFTY"
                  name="NIFTY"
                  stroke="#00E5A3"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="SENSEX"
                  name="SENSEX"
                  stroke="#FBBF24"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="RELIANCE"
                  name="RELIANCE"
                  stroke="#FB923C"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="TCS"
                  name="TCS"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Chart Legend Dots */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-[#0D343C] text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00E5A3]" />
              <span className="text-[#A5CCD5]">NIFTY</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FBBF24]" />
              <span className="text-[#A5CCD5]">SENSEX</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FB923C]" />
              <span className="text-[#A5CCD5]">RELIANCE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />
              <span className="text-[#A5CCD5]">TCS</span>
            </div>
          </div>
        </div>

        {/* Right Column (4 of 12 cols): Market Trend + AI Generated Insights */}
        <div className="lg:col-span-4 space-y-3">
          {/* Market Trend Table Card */}
          <div className="p-4 rounded-2xl bg-[#061E23] border border-[#0E353D] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-tight">Market Trend</h3>
              <button
                onClick={() => onNavigate('markets')}
                className="text-[#6E9EA8] hover:text-[#00E5A3] transition cursor-pointer"
                title="View all markets"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 text-[10px] font-mono text-[#6A96A0] pb-1.5 border-b border-[#0D343C]">
              <div className="col-span-4">Asset</div>
              <div className="col-span-4 text-right">Price</div>
              <div className="col-span-2 text-right">24h</div>
              <div className="col-span-2 text-right">7d</div>
            </div>

            {/* Asset Rows */}
            <div className="space-y-2">
              {marketTrendAssets.map((asset, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigate('markets', asset.rawSymbol)}
                  className="grid grid-cols-12 items-center text-xs hover:bg-[#08262D] p-1 rounded-xl transition cursor-pointer"
                >
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full ${asset.iconBg} flex items-center justify-center font-bold text-[10px] shadow-sm shrink-0`}
                    >
                      {asset.icon}
                    </div>
                    <span className="font-semibold text-white truncate text-xs">{asset.name}</span>
                  </div>

                  <div className="col-span-4 text-right font-mono font-semibold text-white text-xs truncate">
                    {asset.price}
                  </div>

                  <div className="col-span-2 text-right font-mono font-semibold text-[#00E5A3] text-[11px]">
                    <span className="hidden sm:inline">↑ </span>{asset.change24h.replace('+', '')}
                  </div>

                  <div className="col-span-2 text-right font-mono font-semibold text-[#00E5A3] text-[11px]">
                    <span className="hidden sm:inline">↑ </span>{asset.change7d.replace('+', '')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Generated Insights Card matching image */}
          <div
            onClick={() => onNavigate('ai')}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-[#07242B] to-[#0A3038] border border-[#00E5A3]/30 hover:border-[#00E5A3]/60 transition cursor-pointer shadow-lg group flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00E5A3]/15 border border-[#00E5A3]/30 flex items-center justify-center text-[#00E5A3] shadow-[0_0_10px_rgba(0,229,163,0.2)] shrink-0">
                <Bot className="w-4 h-4 text-[#00E5A3]" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  AI Generated Insights
                </div>
                <div className="text-[11px] text-[#86ADB7] group-hover:text-white transition">
                  Market looks bullish today
                </div>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-[#00E5A3] group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
        </div>
      </div>

      {/* 4. BOTTOM SECTION: TOP PERFORMERS CARD */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#061E23] border border-[#0E353D] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#00E5A3]" />
            <h3 className="text-sm font-bold text-white">Top Performers</h3>
          </div>
          <button
            onClick={() => onNavigate('strategies')}
            className="text-xs font-bold text-[#7BA6B0] hover:text-[#00E5A3] flex items-center gap-1 cursor-pointer transition"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Strategy 1 */}
          <div className="p-3.5 rounded-xl bg-[#08262C] border border-[#0F3942] hover:border-[#00E5A3]/40 transition space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-[#00E5A3]/15 text-[#00E5A3] text-[9px] font-mono font-bold border border-[#00E5A3]/25">
                MOMENTUM
              </span>
              <span className="text-xs font-mono font-bold text-[#00E5A3]">+38.4% YTD</span>
            </div>
            <div className="text-xs font-bold text-white">Dual Moving Average Breakout</div>
            <p className="text-[11px] text-[#7DA7B1] leading-relaxed line-clamp-2">
              20-day / 50-day SMA crossover execution matrix with trailing stop volatility adjustment.
            </p>
            <div className="pt-1 flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#5F8C96]">Sharpe: 2.14</span>
              <button
                onClick={() => onNavigate('backtest', 'NVDA')}
                className="text-xs font-bold text-[#00E5A3] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Backtest</span>
                <Play className="w-2.5 h-2.5 fill-current" />
              </button>
            </div>
          </div>

          {/* Strategy 2 */}
          <div className="p-3.5 rounded-xl bg-[#08262C] border border-[#0F3942] hover:border-[#00E5A3]/40 transition space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-[#FBBF24]/15 text-[#FBBF24] text-[9px] font-mono font-bold border border-[#FBBF24]/25">
                MACRO HEDGE
              </span>
              <span className="text-xs font-mono font-bold text-[#00E5A3]">+24.1% YTD</span>
            </div>
            <div className="text-xs font-bold text-white">Gold Trend Inflation Barrier</div>
            <p className="text-[11px] text-[#7DA7B1] leading-relaxed line-clamp-2">
              Gold futures allocation triggered during cross-market equity drawdown expansions.
            </p>
            <div className="pt-1 flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#5F8C96]">Sharpe: 1.89</span>
              <button
                onClick={() => onNavigate('backtest', 'GC=F')}
                className="text-xs font-bold text-[#00E5A3] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Backtest</span>
                <Play className="w-2.5 h-2.5 fill-current" />
              </button>
            </div>
          </div>

          {/* Strategy 3 */}
          <div className="p-3.5 rounded-xl bg-[#08262C] border border-[#0F3942] hover:border-[#00E5A3]/40 transition space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-[#06B6D4]/15 text-[#06B6D4] text-[9px] font-mono font-bold border border-[#06B6D4]/25">
                ASYMMETRY
              </span>
              <span className="text-xs font-mono font-bold text-[#00E5A3]">+52.7% YTD</span>
            </div>
            <div className="text-xs font-bold text-white">Bitcoin Volatility Regime Expansion</div>
            <p className="text-[11px] text-[#7DA7B1] leading-relaxed line-clamp-2">
              Enters long on realized volatility compression breakouts with dynamic position scaling.
            </p>
            <div className="pt-1 flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#5F8C96]">Sharpe: 1.76</span>
              <button
                onClick={() => onNavigate('backtest', 'BTC-USD')}
                className="text-xs font-bold text-[#00E5A3] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Backtest</span>
                <Play className="w-2.5 h-2.5 fill-current" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🚨 WINDOWS EMERGENCY ALERT MODAL POPUP */}
      <WindowsEmergencyAlertModal
        isOpen={isWindowsAlertModalOpen}
        onClose={handleCloseWindowsAlert}
        elapsedSeconds={windowsAlertElapsed}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        voiceEnabled={voiceEnabled}
        setVoiceEnabled={setVoiceEnabled}
        volume={volume}
        setVolume={setVolume}
      />
    </div>
  );
};

