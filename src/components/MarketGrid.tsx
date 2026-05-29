import { useState } from "react";
import { Search, TrendingUp, TrendingDown, ShieldAlert, Cpu, Heart, Coins } from "lucide-react";
import { MarketAsset, AssetCategory } from "../types";

interface MarketGridProps {
  assets: MarketAsset[];
  selectedSymbol: string;
  onSelectAsset: (symbol: string) => void;
}

export function MarketGrid({ assets, selectedSymbol, onSelectAsset }: MarketGridProps) {
  const [activeTab, setActiveTab] = useState<AssetCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = assets.filter(asset => {
    const matchesTab = activeTab === 'all' || asset.category === activeTab;
    const matchesSearch = asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getCategoryBadgeColor = (category: AssetCategory) => {
    switch (category) {
      case 'crypto': return 'bg-purple-950/40 text-purple-300 border border-purple-900/40';
      case 'forex': return 'bg-cyan-950/40 text-cyan-300 border border-cyan-900/40';
      case 'stock': return 'bg-blue-950/40 text-blue-300 border border-blue-900/40';
    }
  };

  const getSentimentBadge = (label: string) => {
    if (label.includes('Bullish')) {
      return 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1';
    } else if (label.includes('Bearish')) {
      return 'bg-rose-950/40 text-rose-450 border border-rose-900/40 text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1';
    } else {
      return 'bg-slate-800 text-slate-300 border border-slate-750 text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1';
    }
  };

  const getRecColor = (rec: string) => {
    switch (rec) {
      case 'BUY': return 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50';
      case 'SELL': return 'text-rose-400 bg-rose-950/40 border-rose-900/50';
      default: return 'text-yellow-450 bg-yellow-950/40 border-yellow-900/50';
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 md:p-6 flex flex-col h-full font-sans text-slate-100" id="market-grid-container">
      {/* Search and Filters bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-indigo-400 animate-pulse" />
            Tradable Assets
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">Tickers fetch multi-source metrics and update on intervals.</p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xs w-full">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </span>
          <input
            id="market-search-input"
            type="text"
            placeholder="Search crypto, forex, stock..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-950/80 hover:bg-slate-950 focus:bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-950/30 focus:outline-none rounded-xl transition-all text-slate-100 placeholder-slate-500"
          />
        </div>
      </div>

      {/* Categories Toggle Pills */}
      <div className="flex flex-wrap gap-2 mb-4" id="category-filter-bar">
        {(['all', 'stock', 'crypto', 'forex'] as const).map((tab) => (
          <button
            key={tab}
            id={`tab-filter-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-slate-100 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
            }`}
          >
            {tab === 'all' ? 'All Instruments' : tab === 'stock' ? 'Stocks' : tab === 'crypto' ? 'Crypto' : 'Forex Pair'}
          </button>
        ))}
      </div>

      {/* Assets Grid List */}
      <div className="flex-1 overflow-y-auto max-h-[580px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 pr-1">
        {filteredAssets.length > 0 ? (
          filteredAssets.map((asset) => {
            const isSelected = selectedSymbol === asset.symbol;
            const isChangePositive = asset.change24h >= 0;
            const decimals = asset.category === 'forex' ? (asset.symbol === 'USDJPY' ? 2 : 4) : 2;

            return (
              <div
                key={asset.symbol}
                id={`asset-card-${asset.symbol}`}
                onClick={() => onSelectAsset(asset.symbol)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/20'
                    : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {/* Asset Identity and tags */}
                <div className="flex gap-3">
                  <div className="flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-slate-100 text-sm tracking-tight">{asset.symbol}</span>
                      <span className={`text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded-md ${getCategoryBadgeColor(asset.category)}`}>
                        {asset.category}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 mt-1">{asset.name}</span>
                  </div>
                </div>

                {/* Live Ticker price */}
                <div className="flex items-center lg:justify-end gap-5">
                  <div className="text-left lg:text-right">
                    <div className="font-mono font-bold text-slate-100 text-sm md:text-md tracking-tight">
                      ${asset.price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                    </div>
                    
                    <div className={`text-xs font-mono font-semibold flex items-center justify-start lg:justify-end mt-0.5 ${isChangePositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isChangePositive ? <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />}
                      {isChangePositive ? '+' : ''}{asset.change24h.toFixed(2)}%
                    </div>
                  </div>

                  {/* AI Prediction preview */}
                  <div className="hidden lg:flex flex-col items-end gap-1 text-right min-w-[110px]">
                    <div className={getSentimentBadge(asset.sentimentLabel)}>
                      {asset.sentimentLabel}
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans mt-0.5">
                      Predict: <strong className={`font-semibold border-b border-transparent ${asset.predictionLabel === 'BUY' ? 'text-emerald-400' : asset.predictionLabel === 'SELL' ? 'text-rose-450' : 'text-slate-400'}`}>{asset.predictionLabel}</strong> ({asset.predictionConfidence}%)
                    </span>
                  </div>
                </div>

                {/* Mobile indicators panel */}
                <div className="flex lg:hidden items-center justify-between border-t border-slate-800/60 pt-2.5 mt-1 text-xs">
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-slate-500 font-sans text-[10px]">AI Sentiment:</span>
                    <span className={`font-semibold ${asset.sentimentScore >= 50 ? 'text-emerald-400' : 'text-rose-450'}`}>
                      {asset.sentimentScore}% Bullish
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[10px]">Rec:</span>
                    <span className={`font-semibold uppercase px-1.5 py-0.5 rounded border text-[10px] ${getRecColor(asset.predictionLabel)}`}>
                      {asset.predictionLabel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500" id="no-filtered-assets">
            <ShieldAlert className="w-8 h-8 opacity-60 mb-2 text-slate-600" />
            <p className="text-sm font-semibold text-slate-400">No active assets found</p>
            <p className="text-xs text-slate-500">Try adjusting your keyword search query</p>
          </div>
        )}
      </div>
    </div>
  );

}
