import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  BarChart2,
  GitFork,
  PlaySquare,
  BookOpen,
  PieChart,
  Layers,
  FlaskConical,
  Bot
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'markets'
  | 'quant'
  | 'correlation'
  | 'backtest'
  | 'strategies'
  | 'regimes'
  | 'portfolio'
  | 'research'
  | 'ai';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onSelectTab }) => {
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'markets', label: 'Markets', icon: TrendingUp },
    { id: 'quant', label: 'Quant Analysis', icon: BarChart3 },
    { id: 'correlation', label: 'Correlation', icon: GitFork },
    { id: 'backtest', label: 'Backtesting', icon: PlaySquare, badge: 'REAL' },
    { id: 'predictions', label: 'Predictions', icon: Bot, badge: 'LIVE' },
    { id: 'strategies', label: 'Strategies', icon: BookOpen },
    { id: 'regimes', label: 'Regimes', icon: Layers },
    { id: 'portfolio', label: 'Portfolio', icon: PieChart },
    { id: 'research', label: 'Research Lab', icon: FlaskConical },
    { id: 'intelligence', label: 'Intelligence', icon: BarChart2, badge: 'AI' },
    { id: 'ai', label: 'AI Quant', icon: Bot, badge: 'EXPLAIN' }
  ];

  return (
    <nav className="bg-white border-b border-[#DCE7EE] px-4 sm:px-6">
      <div className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#D5EAF7] text-[#193B50] border border-[#236B87]/30 font-bold shadow-2xs'
                  : 'text-[#5E7382] hover:text-[#193B50] hover:bg-[#EAF4FB] border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#236B87]' : 'text-[#8A9AA5]'}`} />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    isActive
                      ? 'bg-[#236B87]/15 text-[#236B87]'
                      : 'bg-[#F6F9FC] text-[#5E7382] border border-[#DCE7EE]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
