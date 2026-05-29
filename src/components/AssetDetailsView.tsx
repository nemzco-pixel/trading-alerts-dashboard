import { useState, useEffect } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Cpu, 
  Target, 
  Layers, 
  Clock, 
  ExternalLink, 
  Loader2, 
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  BarChart3,
  LineChart,
  Zap
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  ComposedChart,
  Bar,
  Cell
} from "recharts";
import { MarketAsset, AssetAnalysis, HistoricalDataPoint, InsiderFiling } from "../types";

interface AssetDetailsViewProps {
  asset: MarketAsset;
  onAnalysisSuccess: (symbol: string, sentimentScore: number, sentimentLabel: string, rec: 'BUY'|'SELL'|'HOLD', conf: number) => void;
}

export function AssetDetailsView({ asset, onAnalysisSuccess }: AssetDetailsViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [historyData, setHistoryData] = useState<HistoricalDataPoint[]>([]);
  const [analysis, setAnalysis] = useState<AssetAnalysis | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Insider and large block trading flows states
  const [insiderFilings, setInsiderFilings] = useState<InsiderFiling[]>([]);
  const [loadingInsider, setLoadingInsider] = useState<boolean>(false);
  
  // Chart render type: "area" vs "candle"
  const [chartType, setChartType] = useState<'area' | 'candle'>('candle');

  // Timeframe switch selector
  const [timeframe, setTimeframe] = useState<'5m' | '15m' | '1h' | '4h' | '1d'>('1h');

  // Analysis loader progress ticker text
  const loadingSteps = [
    "Spinning up Gemini 3.5 Analyst Client...",
    "Querying Google Search index for recent macroeconomic events...",
    "Grounding actual sentiment metrics and news bulletins...",
    "Filtering technical resistances and support levels...",
    "Compiling final prediction models..."
  ];

  // Fetch historic charting datasets
  useEffect(() => {
    let active = true;
    setLoadingHistory(true);
    setErr(null);

    fetch(`/api/historical-data/${asset.symbol}?interval=${timeframe}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not download asset statistics.");
        return res.json();
      })
      .then((data) => {
        if (active) {
          setHistoryData(data);
          // Auto clear analysis when symbol shifts
          setAnalysis(null);
        }
      })
      .catch((e: any) => {
        if (active) setErr(e.message);
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });

    return () => {
      active = false;
    };
  }, [asset.symbol, timeframe]);

  // Load corporate insider and blockchain whale trading records
  useEffect(() => {
    let active = true;
    setLoadingInsider(true);
    
    fetch(`/api/insider-info/${asset.symbol}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not download institutional insider telemetry.");
        return res.json();
      })
      .then((data) => {
        if (active) {
          setInsiderFilings(data);
        }
      })
      .catch((e: any) => {
        console.warn("Failed to fetch insider tracking info:", e);
      })
      .finally(() => {
        if (active) setLoadingInsider(false);
      });

    return () => {
      active = false;
    };
  }, [asset.symbol]);

  // Loading steps animation loop
  useEffect(() => {
    let interval: any;
    if (loadingAnalysis) {
      setAnalysisStep(0);
      interval = setInterval(() => {
        setAnalysisStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 1600);
    }
    return () => clearInterval(interval);
  }, [loadingAnalysis]);

  // Request high-fidelity AI prediction from server (grounded search)
  const triggerAiAnalysis = async () => {
    setLoadingAnalysis(true);
    setErr(null);
    try {
      const response = await fetch("/api/analyze-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: asset.symbol })
      });

      if (!response.ok) {
        throw new Error("Gemini research engine is currently busy or offline. Retrying shortly.");
      }

      const resData = await response.json();
      if (resData && resData.analysis) {
        setAnalysis(resData.analysis);
        
        // Propagate updated sentiment state back to parent state
        const ana = resData.analysis;
        onAnalysisSuccess(
          asset.symbol,
          ana.sentimentScore,
          ana.sentimentLabel,
          ana.recommendation,
          ana.confidence
        );
      } else {
        throw new Error("Engine returned an empty response block.");
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const getRecColor = (rec: string) => {
    switch (rec) {
      case 'BUY': return 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50';
      case 'SELL': return 'text-rose-400 bg-rose-950/40 border-rose-900/50';
      default: return 'text-yellow-450 bg-yellow-950/40 border-yellow-900/50';
    }
  };

  const decimals = asset.category === 'forex' ? (asset.symbol === 'USDJPY' ? 2 : 4) : 2;

  // Transform standard history point elements into OHLC ranges for Candles block
  const transformedChartData = historyData.map((pt) => {
    const openValue = pt.open ?? pt.price * 0.998;
    const closeValue = pt.close ?? pt.price;
    const highValue = pt.high ?? Math.max(openValue, closeValue) * 1.002;
    const lowValue = pt.low ?? Math.min(openValue, closeValue) * 0.998;

    return {
      ...pt,
      open: openValue,
      close: closeValue,
      high: highValue,
      low: lowValue,
      // body holds min-max ranges
      body: [Math.min(openValue, closeValue), Math.max(openValue, closeValue)],
      // wick holds min-max ranges
      wick: [lowValue, highValue],
      isUp: closeValue >= openValue
    };
  });

  const maxVolumeVal = transformedChartData.reduce((acc, curr) => Math.max(acc, curr.volume ?? 0), 0) || 1000;

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 md:p-6 flex flex-col h-full font-sans text-slate-100" id="details-view-container">
      {/* Top Asset Headers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-black text-white tracking-tight" id="detail-asset-symbol">
              {asset.symbol}
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
              {asset.category}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1" id="detail-asset-name">
            {asset.name} • Live Global Feeds
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-left md:text-right">
            <div className="font-mono text-2xl font-bold text-white tracking-tight" id="detail-asset-price">
              ${asset.price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
            </div>
            <div className={`text-xs font-mono font-bold flex items-center justify-start md:justify-end mt-0.5 ${asset.change24h >= 0 ? "text-emerald-400" : "text-rose-450"}`}>
              {asset.change24h >= 0 ? "+" : ""}{asset.change24h.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {err && (
        <div className="p-3.5 mb-4 bg-rose-950/40 border border-rose-900/40 rounded-xl text-rose-300 text-xs font-medium flex items-center gap-2" id="details-error-banner">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* Charting Box */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          {/* Timeframe Switcher Options */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto scrollbar-none">
            {(['5m', '15m', '1h', '4h', '1d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all duration-150 cursor-pointer ${
                  timeframe === tf
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 justify-between md:justify-end">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden sm:inline-block">
              {timeframe} Charts • Live
            </span>
            
            {/* Type trigger buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1.5 shrink-0">
              <button
                onClick={() => setChartType('candle')}
                className={`p-1 px-3 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all inline-flex items-center gap-1 cursor-pointer ${
                  chartType === 'candle'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <BarChart3 className="w-3 h-3 text-current rotate-90" />
                Candles
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`p-1 px-3 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all inline-flex items-center gap-1 cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <LineChart className="w-3 h-3 text-current" />
                Area
              </button>
            </div>
          </div>
        </div>

        <div className="h-64 w-full bg-slate-950/40 rounded-2xl border border-slate-800/80 p-2 relative" id="recharts-chart-wrapper">
          {loadingHistory ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-2xl">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : (historyData.length > 0 && isMounted) ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              {chartType === 'area' ? (
                <AreaChart data={historyData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="time" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => val.toLocaleString(undefined, { maximumFractionDigits: decimals })}
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }}
                    labelClassName="text-xs font-mono font-semibold text-slate-500"
                    formatter={(val: number) => [
                      `$${val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`, 
                      'Closing Price'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                  />
                </AreaChart>
              ) : (
                <ComposedChart data={transformedChartData} barGap="-100%" margin={{ top: 15, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="time" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  {/* Primary price Y-axis */}
                  <YAxis 
                    domain={['auto', 'auto']}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => val.toLocaleString(undefined, { maximumFractionDigits: decimals })}
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  
                  {/* Secondary volume overlay Y-axis (occupying lower 25% of grid chart space) */}
                  <YAxis 
                    yAxisId="volume"
                    orientation="right"
                    domain={[0, maxVolumeVal * 4]}
                    hide={true}
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl font-sans text-xs space-y-1 my-0.5 min-w-[155px] text-slate-100">
                            <div className="font-mono text-[9px] text-slate-500 font-bold mb-1.5 uppercase border-b border-slate-800/80 pb-1 flex justify-between">
                              <span>Quote ({timeframe.toUpperCase()})</span>
                              <span>{data.time}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Open:</span>
                              <span className="font-mono font-medium text-slate-200">${data.open.toLocaleString(undefined, { minimumFractionDigits: decimals })}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">High:</span>
                              <span className="font-mono font-bold text-emerald-400">${data.high.toLocaleString(undefined, { minimumFractionDigits: decimals })}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-500">Low:</span>
                              <span className="font-mono font-bold text-rose-450">${data.low.toLocaleString(undefined, { minimumFractionDigits: decimals })}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Close:</span>
                              <span className="font-mono font-bold text-slate-200">${data.close.toLocaleString(undefined, { minimumFractionDigits: decimals })}</span>
                            </div>
                            <div className="border-t border-slate-900 mt-1.5 pt-1 flex items-center justify-between text-[10px]">
                              <span className="text-slate-500">Volume:</span>
                              <span className="font-mono text-slate-300 font-semibold">{data.volume ? Math.round(data.volume).toLocaleString() : 'N/A'}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Volume Overlay underlying bar: matches direction with tradingview colours */}
                  <Bar dataKey="volume" yAxisId="volume" maxBarSize={6} strokeWidth={0}>
                    {transformedChartData.map((entry, index) => (
                      <Cell 
                        key={`vol-cell-${index}`} 
                        fill={entry.isUp ? "rgba(8, 153, 129, 0.16)" : "rgba(242, 54, 69, 0.16)"} 
                      />
                    ))}
                  </Bar>

                  {/* TradingView candles wick indicator bar (1.5px sizing) */}
                  <Bar dataKey="wick" maxBarSize={1.5} strokeWidth={0}>
                    {transformedChartData.map((entry, index) => (
                      <Cell 
                        key={`wick-cell-${index}`} 
                        fill={entry.isUp ? "#089981" : "#f23645"} 
                        stroke={entry.isUp ? "#089981" : "#f23645"}
                      />
                    ))}
                  </Bar>

                  {/* TradingView candles body indicator bar (10px sizing) */}
                  <Bar dataKey="body" maxBarSize={10} strokeWidth={0}>
                    {transformedChartData.map((entry, index) => (
                      <Cell 
                        key={`body-cell-${index}`} 
                        fill={entry.isUp ? "#089981" : "#f23645"} 
                        stroke={entry.isUp ? "#089981" : "#f23645"}
                      />
                    ))}
                  </Bar>

                </ComposedChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No historical trend values loaded
            </div>
          )}
        </div>
      </div>

      {/* Extra Basic High/Low Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6 bg-slate-950/40 p-3.5 border border-slate-800/60 rounded-xl text-center">
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-500">24h High</span>
          <span className="font-mono font-bold text-xs text-slate-300 mt-0.5 block">
            ${asset.high24h.toLocaleString(undefined, { minimumFractionDigits: decimals })}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-500">24h Low</span>
          <span className="font-mono font-bold text-xs text-slate-300 mt-0.5 block">
            ${asset.low24h.toLocaleString(undefined, { minimumFractionDigits: decimals })}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-500">24h Volume</span>
          <span className="font-mono font-bold text-xs text-slate-300 mt-0.5 block truncate">
            {asset.volume}
          </span>
        </div>
      </div>

      {/* Insider & Institutional Flows Section */}
      <div className="mb-6 bg-slate-950/25 border border-slate-800/80 rounded-2xl p-4 md:p-5 flex flex-col gap-3.5" id="insider-desk-card">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-950/40 border border-indigo-900/50 text-indigo-400 rounded-lg text-sm flex items-center justify-center font-mono">
              🕵️‍♂️
            </span>
            <div>
              <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Insider Intelligence Desk</h4>
              <p className="text-[10px] font-mono text-slate-505 text-slate-400">Form 4 SEC Filings & Large Address trackers</p>
            </div>
          </div>
          <span className="text-[9px] font-mono text-indigo-405 text-indigo-400 font-bold uppercase bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/40 flex items-center gap-1">
            <Activity className="w-2.5 h-2.5 text-indigo-400 animate-pulse" />
            Live Desk
          </span>
        </div>

        {loadingInsider ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 text-indigo-450 animate-spin" strokeWidth={2.5} />
            <span className="text-xs text-slate-500 font-mono">Streaming financial telemetries...</span>
          </div>
        ) : insiderFilings.length > 0 ? (
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {insiderFilings.map((filing) => {
              const getImpactBadge = (score: number) => {
                const isPositive = score >= 0;
                if (Math.abs(score) >= 75) {
                  return isPositive 
                    ? 'text-emerald-450 bg-emerald-950/40 border-emerald-900/40' 
                    : 'text-rose-455 bg-rose-950/40 border-rose-900/40';
                }
                return isPositive 
                  ? 'text-teal-450 bg-teal-950/20 border-teal-900/30' 
                  : 'text-amber-450 bg-amber-950/25 border-amber-900/30';
              };

              const getFilingIcon = (type: string) => {
                switch (type) {
                  case 'buy':
                    return <TrendingUp className="w-3.5 h-3.5 text-emerald-450" />;
                  case 'sell':
                    return <TrendingDown className="w-3.5 h-3.5 text-rose-455" />;
                  case 'leak':
                    return <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />;
                  case 'transfer':
                    return <RefreshCw className="w-3.5 h-3.5 text-blue-400" />;
                  default:
                    return <Activity className="w-3.5 h-3.5 text-indigo-455" />;
                }
              };

              return (
                <div key={filing.id} className="bg-slate-950/45 hover:bg-slate-950/80 p-3 rounded-xl border border-slate-900/90 transition-all flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-slate-900 rounded-lg border border-slate-800 shrink-0">
                        {getFilingIcon(filing.type)}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-xs text-slate-200 block truncate">{filing.actor}</span>
                        <span className="text-[10px] text-slate-500 block font-mono truncate">{filing.title} • {filing.age}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono shrink-0">
                      <span className="text-[10px] font-bold text-slate-400">{filing.qty}</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getImpactBadge(filing.impact)}`}>
                        {filing.impact > 0 ? `+${filing.impact}%` : `${filing.impact}%`} Vol
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal font-sans pl-1.5 border-l-2 border-slate-800">
                    {filing.action}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500 font-mono text-[11px]">
            No live insider trails logged for {asset.symbol}
          </div>
        )}
      </div>

      {/* Gemini AI predictive reporting section */}
      <div className="flex-1 flex flex-col justify-end" id="prediction-section">
        {!analysis && !loadingAnalysis ? (
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950/25 border border-indigo-900/30 p-5 shrink-0 text-center rounded-2xl flex flex-col items-center justify-center">
            <div className="p-3 bg-slate-950 rounded-xl shadow-sm border border-indigo-950 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <h3 className="font-display font-bold text-slate-200 text-sm">Create Complete AI-Driven Prediction Report</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-normal">
              Instructs Google Gemini 3.5 to assemble real-time web news and compile sentiment indexes, resistance targets & Buy/Sell recommendations.
            </p>
            <button
              id="btn-deploy-ai-analysis"
              onClick={triggerAiAnalysis}
              className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-sm shadow-indigo-500/10 transition-colors inline-flex items-center gap-2"
            >
              <Cpu className="w-3.5 h-3.5" />
              Generate Prediction Report
            </button>
          </div>
        ) : loadingAnalysis ? (
          <div className="border border-slate-800 p-6 rounded-2xl text-center flex flex-col items-center justify-center gap-4 bg-slate-950/50" id="analysis-loader-box">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-bounce" />
              </div>
            </div>

            <div>
              <p className="text-xs text-indigo-400 font-bold tracking-wide uppercase">AI Research Engine Active</p>
              <p className="text-sm font-semibold text-slate-300 mt-1 transition-all">
                {loadingSteps[analysisStep]}
              </p>
            </div>
          </div>
        ) : (
          analysis && (
            <div className="bg-slate-950/20 border border-slate-800 rounded-2xl p-5 md:p-6 flex flex-col gap-5 flex-1 overflow-y-auto" id="analysis-report-box">
              
              {/* Report Header: Decision */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-1.5 bg-indigo-950/40 border border-indigo-900/50 text-indigo-400 rounded-md">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase font-bold text-slate-400">AI Predictive Rating</h4>
                    <p className="text-[10px] font-mono text-slate-500">Analyzed {new Date(analysis.lastAnalyzed).toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="block text-[9px] uppercase font-bold text-slate-500">AI RECOM.</span>
                    <span className={`font-display font-extrabold text-sm px-3 py-1 rounded-lg mt-0.5 inline-block border ${getRecColor(analysis.recommendation)}`}>
                      {analysis.recommendation}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] uppercase font-bold text-slate-500">CONFIDENCE</span>
                    <span className="block font-mono font-bold text-slate-200 mt-1">
                      {analysis.confidence}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Sentiment Dial bar */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                  <span className="text-slate-400">AI Sentiment Index</span>
                  <span className={`font-bold ${analysis.sentimentScore >= 50 ? 'text-emerald-400' : 'text-rose-450'}`}>
                    {analysis.sentimentLabel} ({analysis.sentimentScore}/100)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                  <div 
                    className={`h-full transition-all duration-1000 ${analysis.sentimentScore >= 60 ? 'bg-emerald-500' : analysis.sentimentScore <= 40 ? 'bg-rose-500' : 'bg-yellow-500'}`}
                    style={{ width: `${analysis.sentimentScore}%` }}
                  />
                </div>
              </div>

              {/* Report Body Summary */}
              <div>
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-2">Research Summary</h5>
                <p className="text-xs text-slate-400 leading-relaxed font-sans" id="summary-analysis-text">
                  {analysis.summary}
                </p>
              </div>

              {/* Technical Pivot Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-emerald-950/25 p-3 rounded-xl border border-emerald-900/40">
                  <span className="block text-[9px] font-bold text-emerald-400 uppercase">Support Target</span>
                  <span className="block font-mono text-xs font-bold text-emerald-300 mt-0.5">
                    ${analysis.support.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                  </span>
                </div>
                <div className="bg-rose-950/25 p-3 rounded-xl border border-rose-900/40">
                  <span className="block text-[9px] font-bold text-rose-400 uppercase">Resistance Target</span>
                  <span className="block font-mono text-xs font-bold text-rose-300 mt-0.5">
                    ${analysis.resistance.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                  </span>
                </div>
              </div>

              {/* Support Outlook and Drivers */}
              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                    Short-Term Outlook (48-72h)
                  </h5>
                  <p className="text-xs font-medium text-slate-300 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/85">
                    {analysis.shortTermOutlook}
                  </p>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Core News Catalysts
                  </h5>
                  <ul className="space-y-1.5">
                    {analysis.keyFactors.map((factor, index) => (
                      <li key={index} className="text-xs text-slate-400 flex items-start gap-1.5 font-sans">
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Grounded Citation lists */}
                {analysis.sources && analysis.sources.length > 0 && (
                  <div className="border-t border-slate-800/50 pt-4">
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-2.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Grounded Sources & Citations
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {analysis.sources.map((src, index) => (
                        <a
                          key={index}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          referrerPolicy="no-referrer"
                          className="text-[10px] text-indigo-450 font-medium hover:text-indigo-300 bg-indigo-950/50 hover:bg-indigo-950 p-1.5 px-3 rounded border border-indigo-900/50 inline-flex items-center gap-1 transition-colors"
                        >
                          <span className="truncate max-w-[150px]">{src.title}</span>
                          <ExternalLink className="w-3 h-3 text-indigo-500 inline" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                id="btn-re-deploy-ai"
                onClick={triggerAiAnalysis}
                className="py-2.5 mt-2 text-xs font-semibold text-indigo-400 border border-indigo-900 hover:border-indigo-700 hover:bg-indigo-950/30 bg-slate-950 rounded-xl cursor-pointer transition-all inline-flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Grounded Intelligence Report
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
