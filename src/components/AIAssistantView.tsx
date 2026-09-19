import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  User,
  Copy,
  Check,
  Trash2,
  TrendingUp,
  Shield,
  Zap,
  HelpCircle,
  Cpu
} from 'lucide-react';
import { BacktestResult } from '../types';
import { askAIChatApi } from '../services/api';

interface AIAssistantViewProps {
  currentBacktest: BacktestResult | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({ currentBacktest }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I am your **QUANTX ChatGPT Intelligence Assistant**, an advanced quantitative AI model.

I can help you with:
- 📊 **Algorithmic Backtesting Analysis** & Performance Attribution
- 🛡️ **Risk & Volatility Management** (Sharpe, Sortino, Max Drawdown)
- 🌊 **Market Regimes & Macro Indicators** (Bullish Trends, Crash Protection)
- 💸 **Transaction Cost & Slippage Drag Calculations**

Ask me anything or select a quantitative inquiry below!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'QUANTX Financial AI v4.0'
    }
  ]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [useBacktestContext, setUseBacktestContext] = useState<boolean>(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const samplePrompts = [
    'Explain Sharpe vs. Sortino ratio with formulas',
    'How do transaction costs impact backtest returns?',
    'What strategy works best in high volatility regimes?',
    'How to reduce maximum drawdown in algorithmic trading?',
    'Compare Buy & Hold vs SMA Crossover for NVDA'
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const payloadMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const contextData = useBacktestContext && currentBacktest ? currentBacktest : null;

      const response = await askAIChatApi(payloadMessages, contextData);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: response.model || 'QUANTX ChatGPT Engine'
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **AI Service Notice**: Unable to generate response. (${err.message || 'Network error'})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: 'System'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: 'Chat history cleared. How can I assist your quantitative analysis today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: 'QUANTX Financial AI v4.0'
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[550px] bg-[#040F12] text-white rounded-3xl border border-[#0F353E] shadow-2xl overflow-hidden font-mono">
      {/* ChatGPT Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#071F26] border-b border-[#0F353E]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#00E5A3]/15 border border-[#00E5A3]/40 flex items-center justify-center text-[#00E5A3] shadow-[0_0_12px_rgba(0,229,163,0.2)]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">QUANTX AI Assistant</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#00E5A315] text-[#00E5A3] border border-[#00E5A330] font-bold">
                ChatGPT SYSTEM
              </span>
            </div>
            <p className="text-[10px] text-[#58818B]">Real-time Quantitative Financial LLM Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentBacktest && (
            <label className="flex items-center gap-1.5 text-xs text-[#8DB4BE] cursor-pointer bg-[#09252D] px-3 py-1.5 rounded-xl border border-[#133F4A]">
              <input
                type="checkbox"
                checked={useBacktestContext}
                onChange={e => setUseBacktestContext(e.target.checked)}
                className="accent-[#00E5A3] cursor-pointer"
              />
              <span className="text-[11px]">Include Backtest Context ({currentBacktest.symbol})</span>
            </label>
          )}

          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#09252D] hover:bg-[#0E303A] text-xs text-[#7A9EA7] hover:text-white border border-[#133F4A] transition cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin scrollbar-thumb-[#113842]">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.role === 'user'
                  ? 'bg-[#124B55] text-[#00E5A3] border border-[#00E5A3]/40'
                  : 'bg-[#00E5A3]/15 text-[#00E5A3] border border-[#00E5A3]/30'
              }`}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#124B55] text-white rounded-tr-xs border border-[#00E5A3]/30 shadow-lg'
                  : 'bg-[#071F26] text-[#D8ECF0] rounded-tl-xs border border-[#0F353E] shadow-xl'
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-[#0F353E]/60 text-[10px] text-[#58818B]">
                <span className="font-bold uppercase tracking-wider text-[#00E5A3]">
                  {msg.role === 'user' ? 'You' : msg.model || 'QUANTX AI'}
                </span>
                <div className="flex items-center gap-2">
                  <span>{msg.timestamp}</span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="hover:text-white transition cursor-pointer"
                      title="Copy to clipboard"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-[#00E5A3]" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div className="whitespace-pre-line text-[#D8ECF0] space-y-2">
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#00E5A3]/15 border border-[#00E5A3]/30 flex items-center justify-center text-[#00E5A3] shrink-0">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="bg-[#071F26] border border-[#0F353E] rounded-2xl rounded-tl-xs p-4 text-xs text-[#00E5A3] flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>QUANTX AI is thinking & computing response...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompt Cards */}
      <div className="px-4 py-2 bg-[#06181D] border-t border-[#0F353E]/80">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] text-[#58818B] shrink-0 uppercase tracking-wider font-bold">Suggested:</span>
          {samplePrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(p)}
              disabled={loading}
              className="px-3 py-1 rounded-xl bg-[#09252D] hover:bg-[#0E303A] text-[11px] text-[#7A9EA7] hover:text-[#00E5A3] border border-[#133F4A] transition whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#071F26] border-t border-[#0F353E]">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Ask QUANTX AI anything about trading, formulas, strategy performance, risk ratios..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            disabled={loading}
            className="flex-1 bg-[#09252D] border border-[#133F4A] rounded-2xl px-4 py-3 text-xs text-white placeholder-[#58818B] focus:outline-none focus:border-[#00E5A3] transition shadow-inner disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            className="px-5 py-3 rounded-2xl bg-[#00E5A3] hover:bg-[#00C98F] text-[#051518] text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 shrink-0"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">SEND</span>
          </button>
        </div>
      </div>
    </div>
  );
};
