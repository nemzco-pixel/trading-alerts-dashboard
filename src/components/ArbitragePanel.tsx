import { useState } from "react";
import { 
  Zap, 
  Shuffle, 
  Coins, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Cpu, 
  X, 
  Search, 
  SlidersHorizontal, 
  Maximize2, 
  Minimize2,
  ChevronDown,
  ChevronUp,
  Server,
  Activity,
  Link,
  Link2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ArbitrageOpportunity } from "../types";

interface ArbitragePanelProps {
  opportunities: ArbitrageOpportunity[];
  accumulatedProfit: number;
  onExecuteSuccessful: (profit: number, message: string) => void;
  refreshInterval: number;
}

export function ArbitragePanel({
  opportunities,
  accumulatedProfit,
  onExecuteSuccessful,
  refreshInterval,
}: ArbitragePanelProps) {
  // Low-latency transaction step tracking
  const [executingIds, setExecutingIds] = useState<{ [id: string]: 'routing' | 'filling' | 'complete' | null }>({});
  
  // Custom view expansion selectors
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal terminal utility filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'crypto' | 'forex' | 'stock'>('all');
  const [sortBy, setSortBy] = useState<'spread' | 'profit' | 'symbol'>('spread');

  // Integrations mapping for real exchange linkages
  const [connectedExchanges, setConnectedExchanges] = useState<{ [exchange: string]: boolean }>({
    "Binance": true,
    "Coinbase": true,
    "Kraken": false,
    "Bybit": false,
    "Uniswap Pro": false,
    "London FX": true,
    "New York Clearing": false,
    "Tokyo Exchange": false,
    "Zurich Bank": false,
    "NYSE Group": true,
    "NASDAQ Int.": false,
    "LSE London": false,
    "Frankfurt Boers": false,
  });

  const [showConnectionWarningFor, setShowConnectionWarningFor] = useState<ArbitrageOpportunity | null>(null);
  const [linkingProcess, setLinkingProcess] = useState<'idle' | 'handshake' | 'sync' | 'completing'>('idle');

  const handleExecute = async (opp: ArbitrageOpportunity, skipConnectionCheck = false) => {
    if (executingIds[opp.id]) return;

    const sourceConnected = connectedExchanges[opp.sourceExchange];
    const targetConnected = connectedExchanges[opp.targetExchange];

    if (!skipConnectionCheck && (!sourceConnected || !targetConnected)) {
      setShowConnectionWarningFor(opp);
      return;
    }

    // Phase 1: Routing via virtual fibers
    setExecutingIds(prev => ({ ...prev, [opp.id]: 'routing' }));
    await new Promise(r => setTimeout(r, 550));

    // Phase 2: Order Filling
    setExecutingIds(prev => ({ ...prev, [opp.id]: 'filling' }));
    await new Promise(r => setTimeout(r, 650));

    try {
      const resp = await fetch("/api/arbitrage/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opp.id })
      });

      if (resp.ok) {
        const data = await resp.json();
        
        // Phase 3: Completed secure handshake
        setExecutingIds(prev => ({ ...prev, [opp.id]: 'complete' }));
        onExecuteSuccessful(data.profit, data.message);

        // Clear state nicely
        setTimeout(() => {
          setExecutingIds(prev => {
            const copy = { ...prev };
            delete copy[opp.id];
            return copy;
          });
        }, 1200);
      } else {
        throw new Error();
      }
    } catch {
      setExecutingIds(prev => {
        const copy = { ...prev };
        delete copy[opp.id];
        return copy;
      });
      alert("Arbitrage quotation expired: Price spreads shifted before routing completed. Real-world liquidity pools have recalculated.");
    }
  };

  const handleEstablishConnectionAndTrade = async (opp: ArbitrageOpportunity) => {
    setLinkingProcess('handshake');
    await new Promise(r => setTimeout(r, 650));
    
    setLinkingProcess('sync');
    await new Promise(r => setTimeout(r, 650));

    setLinkingProcess('completing');
    await new Promise(r => setTimeout(r, 500));

    // Connect both exchanges
    setConnectedExchanges(prev => ({
      ...prev,
      [opp.sourceExchange]: true,
      [opp.targetExchange]: true
    }));

    setLinkingProcess('idle');
    setShowConnectionWarningFor(null);

    // Now trigger the actual execution!
    handleExecute(opp, true);
  };

  // Determine standard layout rendered lists
  const inlineDisplayedOpps = isExpanded ? opportunities : opportunities.slice(0, 4);

  // Filter & sort for the Immersive Desktop Modal Terminal
  const getFilteredModalOpps = () => {
    let list = [...opportunities];

    // Search query ticker match
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(o => 
        o.symbol.toLowerCase().includes(q) || 
        o.assetName.toLowerCase().includes(q) ||
        o.sourceExchange.toLowerCase().includes(q) ||
        o.targetExchange.toLowerCase().includes(q)
      );
    }

    // Category routing match
    if (categoryFilter !== 'all') {
      list = list.filter(o => {
        const isForex = o.symbol.includes("USD") || o.symbol.includes("GBP") || o.symbol.includes("JPY") || o.symbol.includes("EUR");
        const isCrypto = o.symbol.endsWith("USDT");
        if (categoryFilter === 'crypto') return isCrypto;
        if (categoryFilter === 'forex') return isInternetForex(o.symbol);
        // Fallback stocks
        return !isCrypto && !isInternetForex(o.symbol);
      });
    }

    // Simple ticker evaluation
    function isInternetForex(sym: string) {
      return sym.startsWith("EUR") || sym.startsWith("GBP") || sym.startsWith("USD") || sym.startsWith("AUD") || sym.startsWith("CAD");
    }

    // Sort order evaluation
    list.sort((a, b) => {
      if (sortBy === 'profit') return b.estimatedProfit - a.estimatedProfit;
      if (sortBy === 'symbol') return a.symbol.localeCompare(b.symbol);
      return b.spreadPercent - a.spreadPercent; // default: spreads
    });

    return list;
  };

  const modalOpps = getFilteredModalOpps();
  const uniqueExchangesInActivePools = Array.from(new Set(
    opportunities.flatMap(o => [o.sourceExchange, o.targetExchange])
  )).slice(0, 8);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-full text-slate-100" id="arbitrage-panel-wrapper">
      
      {/* 1. COMPACT PANEL HEADER */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-3.5 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4.5 h-4.5 text-yellow-500 animate-pulse fill-yellow-500/10" />
            <h3 className="font-display font-black text-sm text-white tracking-widest uppercase">Arbitrage Deck</h3>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-900/50 inline-flex items-center gap-1 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              {opportunities.length} Pools
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Global split-second rate spreads</p>
        </div>

        {/* Dynamic header button to maximize directly */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 border border-slate-850 hover:border-slate-700 transition"
          title="Open Fullscreen Desk"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* 2. NET PROFIT SNAPSHOT METERS */}
      <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 mb-3.5 flex items-center justify-between shrink-0 font-mono">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-450" />
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Captured Yield</span>
        </div>
        <span className="text-sm font-extrabold text-emerald-400">
          +${accumulatedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* 2.5 EXCHANGERS LINK STATUS */}
      <div className="bg-slate-950/45 border border-slate-850 rounded-xl p-2.5 mb-4 text-xs shrink-0 select-none">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] uppercase font-bold text-slate-400 font-mono flex items-center gap-1">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Exchangers Linkages
          </span>
          <span className="text-[8px] text-slate-500 font-mono">Demo API Broker</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {uniqueExchangesInActivePools.length > 0 ? (
            uniqueExchangesInActivePools.map((exchange) => {
              const isConnected = connectedExchanges[exchange];
              return (
                <button
                  key={exchange}
                  onClick={() => {
                    setConnectedExchanges(prev => ({
                      ...prev,
                      [exchange]: !prev[exchange]
                    }));
                  }}
                  className={`px-1.5 py-0.5 rounded-md border font-mono text-[9px] flex items-center gap-1 transition-all ${
                    isConnected 
                      ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-450 hover:bg-emerald-950/40 cursor-pointer" 
                      : "bg-amber-950/10 border-amber-900/30 text-amber-500 hover:bg-amber-950/30 font-semibold cursor-pointer"
                  }`}
                  title={`Click to ${isConnected ? "Disconnect" : "Connect"} ${exchange}`}
                >
                  {exchange}
                  <span className={`text-[8px] px-1 rounded-sm ${isConnected ? "bg-emerald-950 text-emerald-450" : "bg-amber-950 text-amber-500"}`}>
                    {isConnected ? "OK" : "OFF"}
                  </span>
                </button>
              );
            })
          ) : (
            <span className="text-[9px] text-slate-500 font-mono">Scanning active pathways...</span>
          )}
        </div>
      </div>

      {/* 3. SCROLLING LIST OF IMBALANCES */}
      <div 
        className={`flex-1 overflow-y-auto space-y-3 pr-1 transition-all duration-300 ${
          isExpanded ? "max-h-[500px]" : "max-h-[190px]"
        }`} 
        id="opportunities-list-wrapper"
      >
        {inlineDisplayedOpps.length > 0 ? (
          inlineDisplayedOpps.map((opp) => {
            const status = executingIds[opp.id];
            const isForex = opp.symbol.includes("USD") || opp.symbol.includes("GBP") || opp.symbol.includes("JPY") || opp.symbol.includes("EUR");
            const decimals = isForex ? (opp.symbol === 'USDJPY' ? 2 : 4) : 2;

            return (
              <div 
                key={opp.id} 
                className={`p-3 rounded-xl border transition-all flex flex-col gap-3.5 ${
                  status 
                    ? "bg-indigo-950/20 border-indigo-700/60 ring-1 ring-indigo-500/10" 
                    : "bg-slate-900 border-slate-850 hover:border-slate-800 hover:bg-slate-950/10"
                }`}
                id={`arb-item-${opp.id}`}
              >
                {/* Imbalance details */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-white">{opp.symbol}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">{opp.assetName}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-1.5 py-0.5 rounded">
                    +{opp.spreadPercent}% Spread
                  </span>
                </div>

                {/* Path routing display */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/45 p-2 rounded-lg border border-slate-900 text-[10px] font-mono">
                  <div className="text-left">
                    <span className="text-[8px] uppercase font-bold text-slate-500 block">Buy Route</span>
                    <span className="text-slate-300 block font-semibold truncate">{opp.sourceExchange}</span>
                    <span className="text-emerald-450 block font-bold mt-0.5">${opp.sourcePrice.toLocaleString(undefined, { minimumFractionDigits: decimals })}</span>
                  </div>
                  <div className="text-right border-l border-slate-850/60 pl-2.5">
                    <span className="text-[8px] uppercase font-bold text-slate-500 block">Sell Route</span>
                    <span className="text-slate-300 block font-semibold truncate">{opp.targetExchange}</span>
                    <span className="text-cyan-400 block font-bold mt-0.5">${opp.targetPrice.toLocaleString(undefined, { minimumFractionDigits: decimals })}</span>
                  </div>
                </div>

                {/* Yield details & execution trigger button */}
                <div className="flex items-center justify-between border-t border-slate-850/60 pt-2 text-[11px]">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 font-mono">Profit Pot</span>
                    <span className="font-mono font-extrabold text-emerald-400 block">+${opp.estimatedProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  <button
                    onClick={() => handleExecute(opp)}
                    disabled={!!status}
                    className={`py-1 px-2.5 rounded-lg font-bold text-xs transition duration-150 inline-flex items-center gap-1.5 ${
                      status === 'routing' ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-805 cursor-not-allowed' :
                      status === 'filling' ? 'bg-indigo-950/80 text-cyan-300 border border-cyan-900 animate-pulse cursor-not-allowed' :
                      status === 'complete' ? 'bg-emerald-900 text-emerald-100 border border-emerald-700' :
                      'bg-indigo-650 hover:bg-indigo-600 text-white border border-indigo-705'
                    }`}
                  >
                    {status === 'routing' ? (
                      <>
                        <Cpu className="w-3.5 h-3.5 animate-spin text-indigo-400" /> Routing
                      </>
                    ) : status === 'filling' ? (
                      <>
                        <Coins className="w-3.5 h-3.5 animate-spin text-cyan-400" /> Filling
                      </>
                    ) : status === 'complete' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-450" /> Cleared
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" /> Arb Taker
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center border border-dashed border-slate-805 rounded-xl text-slate-500">
            <Cpu className="w-5 h-5 mx-auto mb-1 animate-spin text-slate-650" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Securing liquidity links...</span>
          </div>
        )}
      </div>

      {/* 4. EXPANSION TRIGGERS FOOTER BAR */}
      {opportunities.length > 4 && (
        <div className="border-t border-slate-800/60 pt-3 mt-3.5 flex items-center justify-between gap-2 shrink-0 select-none">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors hover:underline"
            id="toggle-arbitrage-inline-btn"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" /> Show Standard (4 Spreads)
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" /> View All Spreads ({opportunities.length} Active)
              </>
            )}
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[10px] font-extrabold uppercase text-indigo-400 hover:text-white bg-slate-950/50 border border-slate-800 hover:border-indigo-600 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-all"
            id="open-arbitrage-modal-btn"
          >
            <Maximize2 className="w-3 h-3 text-indigo-400" /> Fullscreen Panel
          </button>
        </div>
      )}

      {/* 5. GORGEOUS IMMERSIVE FULL-SCREEN OVERLAY TERMINAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" id="arb-expanded-overlay">
            {/* Dark glass backdrop with high blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              id="arb-overlay-blur-shield"
            />

            {/* Expansive terminal cockpit */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ type: "spring", damping: 24, stiffness: 200 }}
              className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-slate-100 shadow-2xl"
              id="arb-desk-dialog-interface"
            >
              
              {/* Cockpit Titlebar Header */}
              <div className="border-b border-slate-800/80 bg-slate-950/40 p-5 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-tr from-yellow-500 to-indigo-600 p-2.5 rounded-xl text-white">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-base text-white tracking-wider flex items-center gap-2">
                      LIQUIDITY POOLS & ARBITRAGE TERMINAL
                    </h3>
                    <p className="text-xs text-slate-400 font-medium font-sans">Low-Latency Cross-Exchange Imbalances Router • Interfaced on Live Networks</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {/* Accumulated Profits Metrics on Modal */}
                  <div className="bg-emerald-950/45 border border-emerald-900/80 px-4 py-1.5 rounded-xl text-right font-mono shrink-0">
                    <span className="block text-[8px] uppercase tracking-wider text-emerald-500 font-bold">TOTAL REVENUE CAPTURE</span>
                    <span className="text-sm font-bold text-emerald-400 block">
                      +${accumulatedProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Close button */}
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-1 px-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                    title="Collapse Terminal"
                    id="close-arbitrage-modal-btn-top"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Utility Panel Toolbars: Search, filter, sorting */}
              <div className="bg-slate-950/20 border-b border-slate-800/60 p-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none font-sans">
                
                {/* Search bar */}
                <div className="relative w-full md:max-w-xs">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search asset, route or exchange..."
                    className="w-full bg-slate-900/80 border border-slate-800/80 rounded-lg pl-9 pr-3 py-1.8 text-xs font-semibold placeholder-slate-500 text-slate-200 focus:outline-none focus:border-indigo-505 transition"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-2 hover:text-white text-slate-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                  {/* Category tabs selection */}
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850">
                    {(['all', 'crypto', 'forex', 'stock'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1.5 capitalize rounded-md text-xs font-bold transition ${
                          categoryFilter === cat 
                            ? "bg-slate-800 text-white" 
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Sorters */}
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Order:</span>
                    <select
                      value={sortBy}
                      onChange={(e: any) => setSortBy(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer font-bold"
                    >
                      <option value="spread">Yield Spread % (High)</option>
                      <option value="profit">Yield Net USD (High)</option>
                      <option value="symbol">Ticker Identifier (A-Z)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Scrolling List Cockpit */}
              <div className="flex-1 overflow-y-auto p-5 md:p-6" id="expanded-terminal-rolls">
                {modalOpps.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modalOpps.map((opp) => {
                      const status = executingIds[opp.id];
                      const isForex = opp.symbol.includes("USD") || opp.symbol.includes("GBP") || opp.symbol.includes("JPY") || opp.symbol.includes("EUR");
                      const decimals = isForex ? (opp.symbol === 'USDJPY' ? 2 : 4) : 2;

                      return (
                        <div 
                          key={opp.id} 
                          className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition-all duration-150 ${
                            status 
                              ? "bg-indigo-950/20 border-indigo-500/80 ring-2 ring-indigo-500/10" 
                              : "bg-slate-950/20 border-slate-800 hover:border-slate-700/80 hover:bg-slate-950/40"
                          }`}
                          id={`modal-arb-${opp.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg flex items-center justify-center ${
                                opp.symbol.includes("USD") ? "bg-emerald-950 text-emerald-400 font-bold font-mono text-[10px]" : "bg-neutral-950 text-indigo-400"
                              }`}>
                                {isForex ? "FX" : "★"}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-sm text-white tracking-tight">{opp.symbol}</h4>
                                <p className="text-xs text-slate-400">{opp.assetName}</p>
                              </div>
                            </div>
                            
                            <span className="text-xs font-mono font-bold text-emerald-405 bg-emerald-950/50 border border-emerald-900/50 px-2 py-0.5 rounded-md">
                              +{opp.spreadPercent}% Spread
                            </span>
                          </div>

                          {/* Complex Route Blueprint block */}
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 space-y-2.5 text-xs font-mono">
                            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold pb-1 border-b border-slate-900/80">
                              <span>Path Routings</span>
                              <span>Quotes</span>
                            </div>

                            <div className="flex justify-between items-center text-left">
                              <span className="text-slate-200">
                                🟢 Purchase Node (<strong className="text-slate-100">{opp.sourceExchange}</strong>)
                              </span>
                              <span className="text-emerald-450 font-bold font-mono">
                                ${opp.sourcePrice.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-left border-t border-slate-900/40 pt-1.5">
                              <span className="text-slate-200">
                                🔵 Liquidation Node (<strong className="text-slate-100">{opp.targetExchange}</strong>)
                              </span>
                              <span className="text-cyan-400 font-bold font-mono">
                                ${opp.targetPrice.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                              </span>
                            </div>
                          </div>

                          {/* Quick statistics and launch line */}
                          <div className="flex items-center justify-between border-t border-slate-850 pt-3 text-xs font-mono">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-500">Predicted Yield Yield</span>
                              <span className="block font-bold text-emerald-400 text-sm mt-0.5">
                                +${opp.estimatedProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            <button
                              onClick={() => handleExecute(opp)}
                              disabled={!!status}
                              className={`py-2 px-4 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow transition duration-150 ${
                                status === 'routing' ? 'bg-indigo-900/60 text-indigo-200 border border-indigo-800' :
                                status === 'filling' ? 'bg-indigo-950/80 text-cyan-200 border border-cyan-800 animate-pulse' :
                                status === 'complete' ? 'bg-emerald-900 text-emerald-105 border border-emerald-700' :
                                'bg-indigo-650 hover:bg-indigo-600 text-white'
                              }`}
                            >
                              {status === 'routing' ? (
                                <>
                                  <Cpu className="w-3.5 h-3.5 animate-spin text-indigo-400" /> Routing Packet
                                </>
                              ) : status === 'filling' ? (
                                <>
                                  <Coins className="w-3.5 h-3.5 animate-spin text-cyan-400" /> Executing Order
                                </>
                              ) : status === 'complete' ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-450" /> Secure Settlement
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500/20" /> Trigger Instant Execution
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20 border border-dashed border-slate-805 rounded-2xl">
                    <SlidersHorizontal className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                    <p className="text-xs font-mono uppercase text-slate-500">No active spreads match search filters</p>
                    <button 
                      onClick={() => {
                        setSearchTerm("");
                        setCategoryFilter("all");
                      }} 
                      className="text-xs text-indigo-451 mt-2 underline"
                    >
                      Reset and View All
                    </button>
                  </div>
                )}
              </div>

              {/* Cockpit Footer Status line */}
              <div className="bg-slate-950/60 border-t border-slate-800 p-3.5 px-6 flex items-center justify-between text-[10px] text-slate-500 font-mono shrink-0 select-none">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                  Real-Time Arbitrage Engine Online
                </span>
                <span>Active Channels SSL Locked</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. IMMERSIVE COMPLIED HANDSHAKING AUTHORIZATION MODULE */}
      <AnimatePresence>
        {showConnectionWarningFor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" id="authorization-guard-popup">
            {/* Ambient blurred backdrop shield */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (linkingProcess === 'idle') setShowConnectionWarningFor(null); }}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
              id="auth-guard-backdrop"
            />
            {/* Modal cockpit container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 26, stiffness: 210 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100 z-10"
              id="auth-guard-modal-body"
            >
              <div className="flex items-start justify-between border-b border-slate-805 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h4 className="font-display font-black text-sm text-white tracking-widest uppercase">BRIDGE API HANDSHAKE</h4>
                </div>
                {linkingProcess === 'idle' && (
                  <button
                    onClick={() => setShowConnectionWarningFor(null)}
                    className="p-1 rounded-lg text-slate-405 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                The trade route for <strong className="text-white font-mono">{showConnectionWarningFor.symbol}</strong> travels across exchanges that are currently disconnected. Authorize secure API handshakes to connect them for easy trading.
              </p>

              {/* Path Routing Status indicators */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2.5 mb-4 font-mono text-xs">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 border-b border-slate-900 pb-1">
                  <span>Routing Nodes</span>
                  <span>Credentials Status</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Buy Node ({showConnectionWarningFor.sourceExchange})</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${connectedExchanges[showConnectionWarningFor.sourceExchange] ? "bg-emerald-400" : "bg-amber-400 animate-ping"}`}></span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${connectedExchanges[showConnectionWarningFor.sourceExchange] ? "bg-emerald-950/40 text-emerald-450 border border-emerald-900/40" : "bg-amber-950/20 text-amber-500 border border-amber-900/10"}`}>
                      {connectedExchanges[showConnectionWarningFor.sourceExchange] ? "ACTIVE LINK" : "DISCONNECTED"}
                    </span>
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-900/60 pt-2">
                  <span className="text-slate-400">Sell Node ({showConnectionWarningFor.targetExchange})</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${connectedExchanges[showConnectionWarningFor.targetExchange] ? "bg-emerald-400" : "bg-amber-400 animate-ping"}`}></span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${connectedExchanges[showConnectionWarningFor.targetExchange] ? "bg-emerald-950/40 text-emerald-450 border border-emerald-900/40" : "bg-amber-950/20 text-amber-500 border border-amber-900/10"}`}>
                      {connectedExchanges[showConnectionWarningFor.targetExchange] ? "ACTIVE LINK" : "DISCONNECTED"}
                    </span>
                  </span>
                </div>
              </div>

              {linkingProcess !== 'idle' ? (
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center text-center py-5 font-mono">
                  <Cpu className="w-6 h-6 text-indigo-400 animate-spin mb-2.5" />
                  <span className="text-xs font-bold text-white tracking-wide">
                    {linkingProcess === 'handshake' && "🔑 NEGOTIATING API CREDENTIALS..."}
                    {linkingProcess === 'sync' && "🔄 SYNCHRONIZING ORDER BOOKS..."}
                    {linkingProcess === 'completing' && "🔗 FINALIZING BRIDGE KEY LOCK..."}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Low-latency sync active</span>
                </div>
              ) : (
                <div className="flex gap-2 justify-end text-xs font-bold">
                  <button
                    onClick={() => setShowConnectionWarningFor(null)}
                    className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-805 transition border border-transparent cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleEstablishConnectionAndTrade(showConnectionWarningFor)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white border border-indigo-705 flex items-center gap-1.5 shadow-lg shadow-indigo-950/40 cursor-pointer"
                  >
                    <Link2 className="w-4 h-4 text-indigo-300" /> Bind API & Trade
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
