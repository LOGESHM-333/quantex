import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { MarketsView } from './components/MarketsView';
import { QuantAnalysisView } from './components/QuantAnalysisView';
import { CorrelationView } from './components/CorrelationView';
import { BacktestingView } from './components/BacktestingView';
import { StrategiesView } from './components/StrategiesView';
import { RegimesView } from './components/RegimesView';
import { PortfolioView } from './components/PortfolioView';
import { ResearchLabView } from './components/ResearchLabView';
import { AIAssistantView } from './components/AIAssistantView';
import { SettingsView } from './components/SettingsView';
import { PredictionsView } from './components/PredictionsView';
import { IntelligenceDashboard } from './components/IntelligenceDashboard';
import { ProfileView } from './components/ProfileView';
import { LogoutModal } from './components/LogoutModal';
import { AssetMeta, BacktestResult, SavedResearch, NavTab } from './types';
import { fetchAssets } from './services/api';
import { ShieldAlert, Terminal } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [assets, setAssets] = useState<AssetMeta[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('GC=F');
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Responsive mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Logout modal state
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);

  // Active Backtest Result to pass into AI Explainer
  const [activeBacktestResult, setActiveBacktestResult] = useState<BacktestResult | null>(null);

  // Load Assets
  const loadMarketAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAssets(demoMode);
      setAssets(res.assets || []);
      if (res.demo_mode) {
        setDemoMode(true);
      }
    } catch (err: any) {
      console.error('Failed to fetch assets:', err);
      setError('Unable to reach market data service. Operating in deterministic offline demo mode.');
      setDemoMode(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketAssets();
  }, [demoMode]);

  const handleOpenAIExplainer = (result: BacktestResult) => {
    setActiveBacktestResult(result);
    setCurrentTab('ai');
  };

  const handleSelectStrategyToBacktest = (_strat: string) => {
    setCurrentTab('backtest');
  };

  const handleLoadSavedExperiment = (saved: SavedResearch) => {
    if (saved.symbol) setSelectedSymbol(saved.symbol);
    setCurrentTab('backtest');
  };

  const handleLogoutConfirm = () => {
    setIsLogoutModalOpen(false);
    setActiveBacktestResult(null);
    setCurrentTab('overview');
  };

  return (
    <div className="min-h-screen bg-[#031518] text-[#E2F1F5] flex flex-col font-sans antialiased selection:bg-[#00E5A3]/20 selection:text-[#00E5A3]">
      {/* 1. Permanent Top Global Header */}
      <Header
        currentTab={currentTab}
        assets={assets}
        demoMode={demoMode}
        onToggleDemo={() => setDemoMode(!demoMode)}
        onRefreshData={loadMarketAssets}
        loading={loading}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onNavigateTab={(tab, symbol) => {
          if (symbol) setSelectedSymbol(symbol);
          setCurrentTab(tab);
        }}
        onLogoutClick={() => setIsLogoutModalOpen(true)}
      />

      {/* 2. Main Body Container */}
      <div className="flex-1 w-full max-w-[1780px] mx-auto p-3 sm:p-4 lg:p-5 flex items-start">
        {/* Large Dark Rounded Dashboard Card Container */}
        <div className="flex-1 min-w-0 bg-[#051C20] rounded-[22px] border border-[#0D343C] shadow-2xl overflow-hidden flex flex-col lg:flex-row">
          {/* Embedded Left Dark Sidebar Navigation */}
          <div className="hidden lg:block shrink-0">
            <Sidebar
              currentTab={currentTab}
              onSelectTab={(tab) => setCurrentTab(tab)}
              onLogoutClick={() => setIsLogoutModalOpen(true)}
            />
          </div>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-5 space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-[#2A1D10] border border-[#F59E0B]/40 text-[#FBBF24] font-mono text-xs flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-[#F59E0B]" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-[#9DB9C1] hover:text-white px-2 py-1 rounded-lg bg-[#082228] border border-[#15444F] cursor-pointer font-medium"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Module Views Router */}
            {currentTab === 'overview' && (
              <OverviewView
                assets={assets}
                demoMode={demoMode}
                onNavigate={(tab: NavTab, symbol?: string) => {
                  if (symbol) setSelectedSymbol(symbol);
                  setCurrentTab(tab);
                }}
              />
            )}

            {currentTab === 'markets' && (
              <MarketsView
                assets={assets}
                demoMode={demoMode}
                selectedSymbol={selectedSymbol}
                onSelectSymbol={setSelectedSymbol}
              />
            )}

            {currentTab === 'quant' && (
              <QuantAnalysisView
                assets={assets}
                demoMode={demoMode}
                selectedSymbol={selectedSymbol}
                onSelectSymbol={setSelectedSymbol}
              />
            )}

            {currentTab === 'correlation' && <CorrelationView demoMode={demoMode} />}

            {currentTab === 'backtest' && (
              <BacktestingView
                assets={assets}
                demoMode={demoMode}
                selectedSymbol={selectedSymbol}
                onSelectSymbol={setSelectedSymbol}
                onOpenAIExplainer={handleOpenAIExplainer}
                onNavigate={setCurrentTab}
              />
            )}
{currentTab === 'predictions' && (
            <PredictionsView demoMode={demoMode} />
          )}
            {currentTab === 'intelligence' && (
  <IntelligenceDashboard demoMode={demoMode} />
)}
{currentTab === 'strategies' && (
              <StrategiesView onSelectStrategyToBacktest={handleSelectStrategyToBacktest} />
            )}

            {currentTab === 'regimes' && (
              <RegimesView
                assets={assets}
                demoMode={demoMode}
                selectedSymbol={selectedSymbol}
              />
            )}

            {currentTab === 'portfolio' && <PortfolioView demoMode={demoMode} />}

            {currentTab === 'research' && (
              <ResearchLabView
                demoMode={demoMode}
                selectedSymbol={selectedSymbol}
                onLoadIntoBacktester={handleLoadSavedExperiment}
              />
            )}

            {currentTab === 'ai' && (
              <AIAssistantView currentBacktest={activeBacktestResult} />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                demoMode={demoMode}
                onToggleDemo={() => setDemoMode(!demoMode)}
              />
            )}

            {currentTab === 'profile' && <ProfileView />}
          </main>
        </div>
      </div>

      {/* Mobile Drawer Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setIsMobileSidebarOpen(false);
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLogoutClick={() => setIsLogoutModalOpen(true)}
        isMobileDrawer={true}
      />

      {/* Institutional Dark Fintech Terminal Footer */}
      <footer className="border-t border-[#09262C] bg-[#031518] py-3 px-6 text-[#5E8A94] text-[11px] font-mono mt-auto">
        <div className="max-w-[1780px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[#00E5A3]" />
            <span className="text-white font-bold tracking-wider">QUANTX INTELLIGENCE</span>
            <span>•</span>
            <span className="text-[#00E5A3] font-semibold">Deterministic Execution Matrix</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Universe: GC=F • BTC-USD • NVDA</span>
            <span>•</span>
            <span>Zero Look-Ahead Guaranteed</span>
          </div>
        </div>
      </footer>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
}

