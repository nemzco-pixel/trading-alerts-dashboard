import { useState, useEffect } from "react";
import { 
  LineChart, 
  BrainCircuit, 
  Settings, 
  BellRing, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Cpu, 
  Sparkles,
  Info,
  Clock,
  Wallet,
  ChevronRight
} from "lucide-react";
import { MarketAsset, TradingAlert, LiveAlertLog, ArbitrageOpportunity } from "./types";
import { MarketGrid } from "./components/MarketGrid";
import { AlertPanel } from "./components/AlertPanel";
import { AssetDetailsView } from "./components/AssetDetailsView";
import { ArbitragePanel } from "./components/ArbitragePanel";
import { WalletPanel } from "./components/WalletPanel";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");
  const [activeAlerts, setActiveAlerts] = useState<TradingAlert[]>([]);
  const [historyAlerts, setHistoryAlerts] = useState<TradingAlert[]>([]);
  const [logs, setLogs] = useState<LiveAlertLog[]>([]);
  const [isGeminiReady, setIsGeminiReady] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5s polling
  const [loading, setLoading] = useState(true);

  // Live premium arbitrage opportunities state lists
  const [arbitrageOpportunities, setArbitrageOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [accumulatedArbitrageProfit, setAccumulatedArbitrageProfit] = useState<number>(0);

  // Live Wallet interactive modal control states
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletTotal, setWalletTotal] = useState<number>(15450.00);


  // Poll arbitrage opportunities from virtual exchanges
  useEffect(() => {
    let active = true;

    const fetchArbitrage = async () => {
      try {
        const response = await fetch("/api/arbitrage");
        if (response.ok) {
          const data = await response.json();
          if (active) {
            setArbitrageOpportunities(data.opportunities);
            setAccumulatedArbitrageProfit(data.accumulatedProfit);
          }
        }
      } catch (e) {
        console.error("Failed to sync structural arbitrage pools", e);
      }
    };

    fetchArbitrage();
    const interval = setInterval(fetchArbitrage, refreshInterval);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refreshInterval]);

  // Poll central asset lists, configuration settings
  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const response = await fetch("/api/market-data");
        if (!response.ok) throw new Error("Faulty state download");
        const data = await response.json();
        
        if (active) {
          setAssets(data.assets);
          setIsGeminiReady(data.isGeminiConfigured);
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to sync server ticker variables", e);
      }
    };

    fetchData(); // first immediate
    const interval = setInterval(fetchData, refreshInterval);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refreshInterval]);

  // Poll alerts arrays (Active vs Historic Triggers)
  useEffect(() => {
    let active = true;

    const fetchAlerts = async () => {
      try {
        const response = await fetch("/api/alerts");
        if (response.ok) {
          const data = await response.json();
          if (active) {
            setActiveAlerts(data.active);
            setHistoryAlerts(data.history);
          }
        }
      } catch (e) {
        console.error("Alert lists synchronized failure", e);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, refreshInterval);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refreshInterval]);

  // Poll systemic alert logs
  useEffect(() => {
    let active = true;

    const fetchLogs = async () => {
      try {
        const response = await fetch("/api/logs");
        if (response.ok) {
          const data = await response.json();
          if (active) {
            setLogs(data);
          }
        }
      } catch (e) {
        console.error("Auditing telemetry stream download error", e);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, refreshInterval);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refreshInterval]);

  // Sync wallet balance metrics for premium header widgets
  const fetchWalletTotal = async () => {
    try {
      const response = await fetch("/api/wallet");
      if (response.ok) {
        const data = await response.json();
        const total = data.wallets.reduce((acc: number, wallet: any) => {
          if (wallet.symbol === "USD") return acc + wallet.balance;
          const virtualRates: { [sym: string]: number } = {
            BTC: 68420.50,
            ETH: 3512.30,
            SOL: 164.85
          };
          const rate = virtualRates[wallet.symbol] || 0;
          return acc + (wallet.balance * rate);
        }, 0);
        setWalletTotal(total);
      }
    } catch (e) {
      console.error("Failed to sync header wallet balances", e);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchWallet = async () => {
      try {
        const response = await fetch("/api/wallet");
        if (response.ok && active) {
          const data = await response.json();
          const total = data.wallets.reduce((acc: number, wallet: any) => {
            if (wallet.symbol === "USD") return acc + wallet.balance;
            const virtualRates: { [sym: string]: number } = {
              BTC: 68420.50,
              ETH: 3512.30,
              SOL: 164.85
            };
            const rate = virtualRates[wallet.symbol] || 0;
            return acc + (wallet.balance * rate);
          }, 0);
          setWalletTotal(total);
        }
      } catch (e) {
        console.error("Polled wallet sync failure", e);
      }
    };

    fetchWallet();
    const interval = setInterval(fetchWallet, refreshInterval);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refreshInterval]);


  // Alert Rule Handlers
  const handleCreateAlert = async (alertData: { symbol: string; type: string; target: number }) => {
    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertData),
      });

      if (response.ok) {
        const newAlert = await response.json();
        setActiveAlerts((prev) => [newAlert, ...prev]);
      }
    } catch (e) {
      console.error("Failed to create watch rule on backend", e);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      const response = await fetch(`/api/alerts/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete watch rule on backend", e);
    }
  };

  // Sync state modifications when Gemini runs an update (keeps grid values fresh)
  const handleAnalysisSuccess = (
    symbol: string,
    sentimentScore: number,
    sentimentLabel: string,
    rec: "BUY" | "SELL" | "HOLD",
    conf: number
  ) => {
    setAssets((prev) =>
      prev.map((asset) => {
        if (asset.symbol === symbol) {
          return {
            ...asset,
            sentimentScore,
            sentimentLabel: sentimentLabel as any,
            predictionLabel: rec,
            predictionConfidence: conf,
          };
        }
        return asset;
      })
    );
  };

  const handleArbitrageExecuteSuccess = (profit: number, message: string) => {
    setAccumulatedArbitrageProfit((prev) => parseFloat((prev + profit).toFixed(2)));
    // Sync live portfolio totals
    fetchWalletTotal();
    // Direct log prepending for split-second latency simulation satisfaction
    const newLogItem: LiveAlertLog = {
      id: `l-arb-local-${Date.now()}`,
      symbol: "ARB",
      message,
      type: "success",
      timestamp: new Date().toISOString()
    };
    setLogs((prev) => [newLogItem, ...prev]);
  };


  const selectedAsset = assets.find((a) => a.symbol === selectedSymbol);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col" id="applet-root-node">
      {/* 1. Global Scrolling Market Ticker Ribbon */}
      <div className="bg-slate-950 text-white py-2 px-4 sm:px-6 lg:px-8 shadow-sm border-b border-slate-900 shrink-0 text-xs overflow-hidden">
        <div className="w-full flex items-center justify-between gap-6" id="top-ribbon-row">
          <div className="flex items-center gap-1.5 shrink-0 font-display font-semibold tracking-wider text-indigo-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            LIVE FEEDS:
          </div>
          
          <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-6 px-4 py-0.5" id="mini-scroller-ticker">
            {assets.slice(0, 8).map((asset) => {
              const isPos = asset.change24h >= 0;
              const decimals = asset.category === 'forex' ? (asset.symbol === 'USDJPY' ? 2 : 4) : 2;
              return (
                <div key={asset.symbol} className="inline-flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-slate-300 font-bold">{asset.symbol}</span>
                  <span className="text-white">${asset.price.toLocaleString(undefined, { minimumFractionDigits: decimals })}</span>
                  <span className={`text-[10px] font-bold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                    {isPos ? "+" : ""}{asset.change24h.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 text-slate-400 shrink-0 text-[11px] font-medium border-l border-slate-800/60 pl-4">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            UTC: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
        </div>
      </div>

      {/* 2. Primary Navigation Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-4 sm:px-6 lg:px-8 shrink-0 z-10 sticky top-0 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-md shadow-indigo-500/10 flex items-center justify-center">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block leading-none font-display">Systemic Trading Platform</span>
              <h1 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight mt-1 leading-none">
                Predictor AI Dashboard
              </h1>
            </div>
          </div>

          {/* Header Action Containers: Wallets controller + connection status */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-sans justify-end">
            {/* Clickable Wallet Pill */}
            <button 
              onClick={() => setWalletOpen(true)}
              className="group flex items-center gap-2.5 bg-slate-950 hover:bg-slate-850 hover:border-slate-705 transition duration-150 border border-slate-800 rounded-xl p-2 px-3.5 select-none"
              title="Open Wallet Account"
              id="top-wallet-access-btn"
            >
              <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition duration-150">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">My Portfolio Wallet</span>
                <span className="text-xs font-mono font-bold text-slate-200 block mt-0.5 tracking-tight group-hover:text-indigo-400 transition">
                  ${walletTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition" />
            </button>

            {/* Connection status card */}
            <div className="hidden xs:flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-2 px-3.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isGeminiReady ? 'bg-indigo-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isGeminiReady ? 'bg-indigo-500' : 'bg-amber-500'}`}></span>
              </span>
              <div className="text-left">
                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Research Intelligence</span>
                <span className="text-xs font-semibold text-slate-300 block mt-0.5">
                  {isGeminiReady ? "Gemini 3.5 Live Grounding Active" : "Simulated Intelligence Mode"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Systemic Notice if Simulated Mode */}
      {!isGeminiReady && (
        <div className="bg-amber-950/45 border-b border-amber-900/40 py-2.5 px-4 sm:px-6 lg:px-8 text-xs font-medium text-amber-200">
          <div className="w-full flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Simulation Mode:</strong> No Gemini API Key was found in your Secrets panel. Connect your <strong>GEMINI_API_KEY</strong> in <strong>Settings &gt; Secrets</strong> to enable active up-to-the-minute web search sentiment reports!
            </span>
          </div>
        </div>
      )}


      {/* 4. Dashboard Canvas Shell */}
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 flex flex-col md:grid md:grid-cols-12 gap-5 lg:gap-6 min-h-0 overflow-y-auto">
        
        {loading ? (
          <div className="col-span-12 flex flex-col items-center justify-center py-20 gap-3">
            <Cpu className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600 font-display">Powering up real-time analytics stream...</p>
          </div>
        ) : (
          <>
            {/* COLUMN LEFT: Asset lists and alert setter triggers (Col span 4) */}
            <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-6">
              
              {/* Tradable list grid */}
              <div className="shrink-0">
                <MarketGrid 
                  assets={assets}
                  selectedSymbol={selectedSymbol}
                  onSelectAsset={setSelectedSymbol}
                />
              </div>

              {/* Watch triggers alert console */}
              <div className="flex-1">
                <AlertPanel
                  assets={assets}
                  activeAlerts={activeAlerts}
                  historyAlerts={historyAlerts}
                  onCreateAlert={handleCreateAlert}
                  onDeleteAlert={handleDeleteAlert}
                />
              </div>
            </div>

            {/* COLUMN RIGHT: Selected Quote charting, Detailed AI analysis (Col span 8) */}
            <div className="md:col-span-7 lg:col-span-8 flex flex-col gap-6">
              
              {/* Core Details and Recharts view */}
              <div className="flex-1 min-h-[500px]">
                {selectedAsset ? (
                  <AssetDetailsView
                    asset={selectedAsset}
                    onAnalysisSuccess={handleAnalysisSuccess}
                  />
                ) : (
                  <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center flex items-center justify-center flex-col h-full">
                    <LineChart className="w-10 h-10 text-slate-700 mb-3" />
                    <p className="font-semibold text-slate-400 text-sm">Please select a tradable asset from the terminal grid</p>
                  </div>
                )}
              </div>

              {/* Multi-Component Dashboard Feed Segment: Arbitrage Opportunities & Systemic logs Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 shrink-0">
                
                <ArbitragePanel
                  opportunities={arbitrageOpportunities}
                  accumulatedProfit={accumulatedArbitrageProfit}
                  onExecuteSuccessful={handleArbitrageExecuteSuccess}
                  refreshInterval={refreshInterval}
                />

                {/* 5. Live Feed Logs Ticker Terminal */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col h-full min-h-[260px]" id="terminal-feed-logs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-100 font-display">Systemic Telemetry & Alerts Feed</h3>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-indigo-400 font-mono">Live Logs Feed</span>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[190px] font-mono text-xs pr-1" id="scrolling-terminal-logs">
                    {logs.length > 0 ? (
                      logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2 py-1 leading-relaxed border-b border-slate-800/10">
                          <span className="text-[10px] text-indigo-400 font-mono shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                          </span>
                          
                          <span className={`text-[10px] uppercase font-bold shrink-0 px-1 rounded ${
                            log.type === 'success' ? 'bg-emerald-950/40 text-emerald-450 border border-emerald-950' :
                            log.type === 'danger' ? 'bg-rose-950/40 text-rose-400 border border-rose-950' :
                            log.type === 'warning' ? 'bg-amber-950/40 text-amber-400 border border-amber-950' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {log.type}
                          </span>

                          <span className="text-slate-200">
                            {log.message}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-500 text-[11px] uppercase tracking-wider">
                        Awaiting live algorithmic events...
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </>
        )}

      </main>

      {/* 6. Dashboard Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-center py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 font-medium shrink-0">
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <span>Predictor AI Platform © 2026. Custom research utilizing Space Grotesk display models.</span>
          <span className="font-mono text-[10px] bg-slate-950 px-2 py-1 rounded border border-slate-800">SERVER ACTIVE • PORT 3000</span>
        </div>
      </footer>

      {/* 7. Slide-over Wallet Overlay Drawer */}
      <AnimatePresence>
        {walletOpen && (
          <div className="fixed inset-0 z-50 flex justify-end" id="wallet-drawer-shim">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWalletOpen(false)}
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
              id="wallet-backdrop-node"
            />
            {/* Control sliding panel */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg h-full shadow-2xl z-10 flex flex-col bg-slate-900 border-l border-slate-800"
              id="wallet-interior-modal"
            >
              <WalletPanel 
                onClose={() => setWalletOpen(false)} 
                onWalletUpdated={fetchWalletTotal}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
