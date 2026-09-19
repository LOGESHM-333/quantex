import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut
} from 'lucide-react';
import { AssetMeta, NavTab } from '../types';

interface HeaderProps {
  currentTab: NavTab;
  assets: AssetMeta[];
  demoMode: boolean;
  onToggleDemo: () => void;
  onRefreshData: () => void;
  loading: boolean;
  onOpenMobileSidebar: () => void;
  onNavigateTab: (tab: NavTab, symbol?: string) => void;
  onSearchSymbol?: (symbol: string) => void;
  onLogoutClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  onNavigateTab,
  onLogoutClick
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    {
      id: 1,
      title: 'NVDA Volatility Expansion',
      desc: '30-day annualized volatility reached 58.2%.',
      time: '12m ago'
    },
    {
      id: 2,
      title: 'Gold Macro Hedge Status',
      desc: 'GC=F established bullish momentum above 200-SMA.',
      time: '45m ago'
    },
    {
      id: 3,
      title: 'Bitcoin Asymmetry Signal',
      desc: 'Breakout detected on 4H volume spike.',
      time: '1h ago'
    },
    {
      id: 4,
      title: 'Deterministic Engine Synchronized',
      desc: 'Zero look-ahead execution matrix fully calibrated.',
      time: '2h ago'
    }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    if (q === 'GOLD' || q === 'GC=F') {
      onNavigateTab('markets', 'GC=F');
      setSearchQuery('');
    } else if (q === 'BTC' || q === 'BITCOIN' || q === 'BTC-USD') {
      onNavigateTab('markets', 'BTC-USD');
      setSearchQuery('');
    } else if (q === 'NVDA' || q === 'NVIDIA') {
      onNavigateTab('markets', 'NVDA');
      setSearchQuery('');
    } else if (q.includes('BACKTEST') || q.includes('PREDICT')) {
      onNavigateTab('backtest');
      setSearchQuery('');
    } else if (q.includes('CORR') || q.includes('CRYPTO')) {
      onNavigateTab('correlation');
      setSearchQuery('');
    } else if (q.includes('PORT')) {
      onNavigateTab('portfolio');
      setSearchQuery('');
    } else if (q.includes('STRAT')) {
      onNavigateTab('strategies');
      setSearchQuery('');
    } else if (q.includes('AI') || q.includes('EXPLAIN')) {
      onNavigateTab('ai');
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#031518] border-b border-[#0A262C] px-4 sm:px-6 lg:px-8">
      {/* Top Header Row matching Reference Image */}
      <div className="h-16 flex items-center justify-between gap-4">
        {/* Left: QUANTX Logo & Branding */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-[#7CA1AB] hover:bg-[#0B252C] border border-[#143F4A] transition"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => onNavigateTab('overview')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {/* Hexagon/Rounded Green Icon with Bars */}
            <div className="w-8 h-8 rounded-xl bg-[#00E5A3]/15 border border-[#00E5A3]/40 flex items-center justify-center text-[#00E5A3] shadow-[0_0_12px_rgba(0,229,163,0.3)]">
              <div className="flex items-end gap-0.5 h-4">
                <div className="w-1 h-2.5 bg-[#00E5A3] rounded-sm" />
                <div className="w-1 h-4 bg-[#00E5A3] rounded-sm" />
                <div className="w-1 h-3 bg-[#00E5A3] rounded-sm" />
              </div>
            </div>
            <div>
              <div className="text-base font-extrabold tracking-wider text-white leading-none">
                QUANTX
              </div>
              <div className="text-[10px] text-[#63909A] font-medium leading-none mt-1">
                Financial Dashboard Collection
              </div>
            </div>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-xl mx-2 sm:mx-8">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-[#5A8791] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets, markets, or insights..."
              className="w-full pl-11 pr-4 py-2 rounded-full bg-[#061E23] border border-[#10373F] text-xs text-[#E1F2F6] placeholder-[#577F88] focus:outline-none focus:border-[#00E5A3]/50 focus:ring-1 focus:ring-[#00E5A3]/30 transition shadow-inner"
            />
          </form>
        </div>

        {/* Right Section: Notifications Bell & User Profile */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Notifications Bell with red badge '0' */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
              }}
              className="relative p-2 text-[#A6CCD5] hover:text-white transition cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-[#9CBFC9]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF4848] ring-2 ring-[#031518]" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-[#082026] rounded-2xl border border-[#15444F] shadow-2xl p-3 z-50 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#123942]">
                  <span className="font-bold text-white">System Notifications</span>
                  <span className="text-[10px] text-[#00E5A3] font-semibold uppercase">4 Events</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-[#0C2B33] border border-[#15424D] hover:border-[#00E5A3]/40 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{n.title}</span>
                        <span className="text-[10px] text-[#5C8690]">{n.time}</span>
                      </div>
                      <div className="text-[11px] text-[#86AEB7] mt-0.5">{n.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill matching Reference Image: "VP" white circle and "Vishaal P" */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 py-1 pr-1 transition cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-white text-[#031518] flex items-center justify-center text-xs font-bold font-sans shadow-sm">
                VP
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-white tracking-wide">
                Vishaal P
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#7CA1AB] group-hover:text-white transition" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[#082026] rounded-2xl border border-[#15444F] shadow-2xl p-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-[#123942] mb-1">
                  <div className="font-bold text-white">Vishaal P</div>
                  <div className="text-[10px] text-[#63909A] font-mono">Senior Quantitative Trader</div>
                </div>
                <button
                  onClick={() => {
                    onNavigateTab('profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[#97BFCA] hover:bg-[#0E303A] hover:text-white transition cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#00E5A3]" />
                  <span>Profile Overview</span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab('settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[#97BFCA] hover:bg-[#0E303A] hover:text-white transition cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-[#00E5A3]" />
                  <span>Platform Settings</span>
                </button>
                <div className="border-t border-[#123942] my-1" />
                <button
                  onClick={() => {
                    if (onLogoutClick) onLogoutClick();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[#FF6363] hover:bg-[#341618] transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>End Session</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
