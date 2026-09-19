import React from 'react';
import {
  LayoutDashboard,
  LineChart,
  BarChart3,
  Coins,
  Bookmark,
  PieChart,
  Target,
  PlaySquare,
  Newspaper,
  Bot,
  Settings,
  X,
  TrendingUp,
  User,
  LogOut,
  BarChart2
} from 'lucide-react';
import { NavTab } from '../types';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onLogoutClick?: () => void;
  isMobileDrawer?: boolean;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: {
    text: string;
    isGreen?: boolean;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onLogoutClick,
  isMobileDrawer = false
}) => {
  // Navigation items matching the reference design layout
  const navItems: NavItemConfig[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'markets', label: 'Markets', icon: LineChart },
    { id: 'quant', label: 'Stock Analysis', icon: BarChart3 },
    { id: 'correlation', label: 'Cryptocurrency', icon: Coins },
    { id: 'portfolio', label: 'Portfolio', icon: PieChart },
    { id: 'predictions', label: 'Predictions', icon: Target },
    { id: 'backtest', label: 'Backtesting', icon: PlaySquare },
    { id: 'research', label: 'Financial News', icon: Newspaper },
    { id: 'intelligence', label: 'Intelligence', icon: BarChart2 },
    {
      id: 'ai',
      label: 'AI Assistant',
      icon: Bot,
      badge: { text: 'Beta', isGreen: true }
    }
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <div className="h-full flex flex-col justify-between select-none bg-[#051C20] text-[#D8ECF0]">
      {/* Branding inside the dark sidebar matching the image */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#00E5A3]/15 border border-[#00E5A3]/40 flex items-center justify-center text-[#00E5A3] shadow-[0_0_12px_rgba(0,229,163,0.25)] mt-0.5 shrink-0">
              <div className="flex items-end gap-0.5 h-3.5">
                <div className="w-1 h-2 bg-[#00E5A3] rounded-sm" />
                <div className="w-1 h-3.5 bg-[#00E5A3] rounded-sm" />
                <div className="w-1 h-2.5 bg-[#00E5A3] rounded-sm" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-wider text-white">QUANTX</h2>
              <p className="text-[10px] text-[#6EA0AA] font-medium leading-tight mt-0.5">
                Smarter Analysis.
                <br />
                Better Decisions.
              </p>
            </div>
          </div>

          {/* Close button on mobile drawer */}
          {isMobileDrawer && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-[#719FA8] hover:bg-[#0C2A31] transition"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-none">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={`${item.id}-${idx}`}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between text-left transition-all duration-150 cursor-pointer rounded-xl h-10 px-3.5 gap-2.5 ${
                isActive
                  ? 'bg-[#0E4850] text-[#00E5A3] font-semibold border border-[#00E5A3]/30 shadow-[0_0_12px_rgba(0,229,163,0.15)]'
                  : 'bg-transparent text-[#7B9EA7] hover:bg-[#09262C] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#00E5A3]' : 'text-[#648B94]'
                  }`}
                />
                <span className="text-xs truncate font-medium">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none shrink-0 ${
                    item.badge.isGreen
                      ? 'bg-[#00E5A3]/20 text-[#00E5A3] border border-[#00E5A3]/30'
                      : 'bg-[#153D47] text-[#97BFCA]'
                  }`}
                >
                  {item.badge.text}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Section with Settings */}
      <div className="p-3 pt-2 border-t border-[#0C3238]">
        <button
          onClick={() => handleNavClick('settings')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition cursor-pointer ${
            currentTab === 'settings'
              ? 'bg-[#0E4850] text-[#00E5A3] font-semibold border border-[#00E5A3]/30'
              : 'text-[#7B9EA7] hover:bg-[#09262C] hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4 text-[#648B94]" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );

  if (isMobileDrawer) {
    if (!isOpenMobile) return null;
    return (
      <div className="lg:hidden fixed inset-0 z-50 flex">
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
          onClick={onCloseMobile}
        />
        <div className="relative w-[240px] max-w-[80vw] h-full shadow-2xl z-10 border-r border-[#0D343C]">
          {navContent}
        </div>
      </div>
    );
  }

  // Normal embedded sidebar inside container
  return (
    <aside className="w-52 lg:w-56 shrink-0 border-r border-[#0C3238] flex flex-col h-full">
      {navContent}
    </aside>
  );
};

