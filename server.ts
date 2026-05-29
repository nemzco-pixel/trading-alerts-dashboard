import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dns from "dns";

// Resolve IPv4 resolution issues for some frameworks/environments
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

app.use(express.json());

// Main cached in-memory database of financial assets
const marketDataCache: { [symbol: string]: any } = {
  // Cryptocurrencies
  "BTCUSDT": { symbol: "BTCUSDT", name: "Bitcoin", category: "crypto", price: 68420.50, change24h: 1.84, high24h: 69100.00, low24h: 67350.00, volume: "24.5K BTC", sentimentScore: 78, sentimentLabel: "Strong Bullish", predictionLabel: "BUY", predictionConfidence: 85, lastUpdated: new Date().toISOString() },
  "ETHUSDT": { symbol: "ETHUSDT", name: "Ethereum", category: "crypto", price: 3512.30, change24h: -0.45, high24h: 3585.00, low24h: 3480.00, volume: "142.1K ETH", sentimentScore: 54, sentimentLabel: "Neutral", predictionLabel: "HOLD", predictionConfidence: 60, lastUpdated: new Date().toISOString() },
  "SOLUSDT": { symbol: "SOLUSDT", name: "Solana", category: "crypto", price: 164.85, change24h: 4.12, high24h: 168.20, low24h: 157.90, volume: "1.2M SOL", sentimentScore: 82, sentimentLabel: "Strong Bullish", predictionLabel: "BUY", predictionConfidence: 88, lastUpdated: new Date().toISOString() },
  
  // Forex Pairs (quoted against USD)
  "EURUSD": { symbol: "EURUSD", name: "EUR / USD", category: "forex", price: 1.0824, change24h: 0.12, high24h: 1.0850, low24h: 1.0810, volume: "Volume: High", sentimentScore: 62, sentimentLabel: "Bullish", predictionLabel: "BUY", predictionConfidence: 65, lastUpdated: new Date().toISOString() },
  "GBPUSD": { symbol: "GBPUSD", name: "GBP / USD", category: "forex", price: 1.2655, change24h: -0.08, high24h: 1.2690, low24h: 1.2630, volume: "Volume: Average", sentimentScore: 48, sentimentLabel: "Neutral", predictionLabel: "HOLD", predictionConfidence: 55, lastUpdated: new Date().toISOString() },
  "USDJPY": { symbol: "USDJPY", name: "USD / JPY", category: "forex", price: 156.42, change24h: 0.35, high24h: 156.90, low24h: 155.80, volume: "Volume: High", sentimentScore: 32, sentimentLabel: "Bearish", predictionLabel: "SELL", predictionConfidence: 70, lastUpdated: new Date().toISOString() },

  // Stocks
  "AAPL": { symbol: "AAPL", name: "Apple Inc.", category: "stock", price: 184.25, change24h: 0.85, high24h: 185.30, low24h: 183.10, volume: "48.2M Shares", sentimentScore: 65, sentimentLabel: "Bullish", predictionLabel: "BUY", predictionConfidence: 72, lastUpdated: new Date().toISOString() },
  "MSFT": { symbol: "MSFT", name: "Microsoft Corp.", category: "stock", price: 415.50, change24h: 1.22, high24h: 417.80, low24h: 412.30, volume: "18.5M Shares", sentimentScore: 75, sentimentLabel: "Strong Bullish", predictionLabel: "BUY", predictionConfidence: 81, lastUpdated: new Date().toISOString() },
  "TSLA": { symbol: "TSLA", name: "Tesla Inc.", category: "stock", price: 178.50, change24h: -2.31, high24h: 184.00, low24h: 176.20, volume: "84.1M Shares", sentimentScore: 38, sentimentLabel: "Bearish", predictionLabel: "SELL", predictionConfidence: 68, lastUpdated: new Date().toISOString() },
  "NVDA": { symbol: "NVDA", name: "NVIDIA Corp.", category: "stock", price: 910.10, change24h: 3.42, high24h: 922.00, low24h: 895.00, volume: "38.9M Shares", sentimentScore: 88, sentimentLabel: "Strong Bullish", predictionLabel: "BUY", predictionConfidence: 90, lastUpdated: new Date().toISOString() },
};

// Alert Management
const alertHistory: any[] = [
  { id: "h-1", symbol: "BTCUSDT", category: "crypto", type: "price_above", target: 68000, isActive: false, isTriggered: true, createdAt: new Date(Date.now() - 3600 * 1000).toISOString(), triggeredAt: new Date(Date.now() - 3000 * 1000).toISOString(), triggerMessage: "Bitcoin crossed above target $68,000" },
  { id: "h-2", symbol: "TSLA", category: "stock", type: "sentiment_below", target: 40, isActive: false, isTriggered: true, createdAt: new Date(Date.now() - 1800 * 1000).toISOString(), triggeredAt: new Date(Date.now() - 1500 * 1000).toISOString(), triggerMessage: "Tesla Sentiment fell below neutral threshold (40)" },
];

let userCreatedAlerts: any[] = [
  { id: "a-1", symbol: "NVDA", category: "stock", type: "price_above", target: 950, isActive: true, isTriggered: false, createdAt: new Date().toISOString() },
  { id: "a-2", symbol: "EURUSD", category: "forex", type: "price_below", target: 1.0800, isActive: true, isTriggered: false, createdAt: new Date().toISOString() },
];

const liveAlertLogs: any[] = [
  { id: "l-1", symbol: "BTCUSDT", message: "Real-time BTC/USDT price breached key resistance level of $68,000.", type: "success", timestamp: new Date(Date.now() - 3000 * 1000).toISOString() },
  { id: "l-2", symbol: "TSLA", message: "Tesla (TSLA) social sentiment dropped significantly to Bearish (38/100).", type: "danger", timestamp: new Date(Date.now() - 1500 * 1000).toISOString() },
  { id: "l-3", symbol: "NVDA", message: "NVIDIA Corp. daily volume exceeds 35M shares on surging corporate AI accelerator demand.", type: "info", timestamp: new Date(Date.now() - 1000 * 1000).toISOString() },
];

// Arbitrage Memory Database
let activeArbitrageOpportunities: any[] = [];
let accumulatedArbitrageProfit = 0.0;

function generateArbitrageOpportunities() {
  const possibleExchangesMap: { [category: string]: string[] } = {
    crypto: ["Binance", "Coinbase", "Kraken", "Bybit", "Uniswap Pro"],
    forex: ["London FX", "New York Clearing", "Tokyo Exchange", "Zurich Bank"],
    stock: ["NYSE Group", "NASDAQ Int.", "LSE London", "Frankfurt Boers"],
  };

  const opportunities: any[] = [];
  const allAssets = Object.values(marketDataCache);

  allAssets.forEach((asset) => {
    const exchanges = possibleExchangesMap[asset.category] || ["Exchange A", "Exchange B"];
    if (exchanges.length < 2) return;

    // Pick 2 separate random exchanges
    const idx1 = Math.floor(Math.random() * exchanges.length);
    let idx2 = Math.floor(Math.random() * exchanges.length);
    while (idx1 === idx2) {
      idx2 = Math.floor(Math.random() * exchanges.length);
    }

    const exSource = exchanges[idx1];
    const exTarget = exchanges[idx2];

    const isCrypto = asset.category === 'crypto';
    const isForex = asset.category === 'forex';
    const spreadLimit = isCrypto ? 0.015 : isForex ? 0.0035 : 0.008; // crypto gets larger spreads
    
    // Spread factor e.g. 0.15% to 1.35%
    const spreadFactor = 0.0015 + Math.random() * spreadLimit;
    const decimals = isForex ? (asset.symbol === 'USDJPY' ? 2 : 4) : 2;

    const sourcePrice = parseFloat((asset.price * (1 - spreadFactor / 2)).toFixed(decimals));
    const targetPrice = parseFloat((asset.price * (1 + spreadFactor / 2)).toFixed(decimals));
    const spreadPercent = parseFloat((((targetPrice - sourcePrice) / sourcePrice) * 100).toFixed(2));

    // Trade size sizes
    let tradeSize = 1;
    if (asset.symbol === 'BTCUSDT') tradeSize = 0.4;
    else if (asset.symbol === 'ETHUSDT') tradeSize = 3;
    else if (asset.symbol === 'SOLUSDT') tradeSize = 40;
    else if (isForex) tradeSize = 25000;
    else if (asset.symbol === 'NVDA') tradeSize = 15;
    else if (asset.symbol === 'AAPL' || asset.symbol === 'MSFT') tradeSize = 30;
    else tradeSize = 50;

    const estimatedProfit = parseFloat(((targetPrice - sourcePrice) * tradeSize).toFixed(2));

    if (estimatedProfit > 0 && spreadPercent >= 0.1) {
      opportunities.push({
        id: `arb-${asset.symbol}-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 100)}`,
        symbol: asset.symbol,
        assetName: asset.name,
        sourceExchange: exSource,
        targetExchange: exTarget,
        sourcePrice,
        targetPrice,
        spreadPercent,
        estimatedProfit,
        tradeSize,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Sort and keep up to 14 prime arbitrage targets
  activeArbitrageOpportunities = opportunities
    .sort((a, b) => b.spreadPercent - a.spreadPercent)
    .slice(0, 14);
}


// 1. Core Market Data Retrieval Loop
const yahooSymbolMap: { [symbol: string]: string } = {
  "BTCUSDT": "BTC-USD",
  "ETHUSDT": "ETH-USD",
  "SOLUSDT": "SOL-USD",
  "EURUSD": "EURUSD=X",
  "GBPUSD": "GBPUSD=X",
  "USDJPY": "USDJPY=X",
  "AAPL": "AAPL",
  "MSFT": "MSFT",
  "TSLA": "TSLA",
  "NVDA": "NVDA"
};

async function fetchYahooFinanceTicker(symbol: string) {
  const yahooSymbol = yahooSymbolMap[symbol];
  if (!yahooSymbol) return;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1d&interval=1d`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (response.ok) {
      const data: any = await response.json();
      const resultObj = data?.chart?.result?.[0];
      const meta = resultObj?.meta;
      if (meta) {
        const livePrice = meta.regularMarketPrice !== undefined && meta.regularMarketPrice !== null
          ? meta.regularMarketPrice 
          : meta.price;
        const prevClose = meta.chartPreviousClose !== undefined && meta.chartPreviousClose !== null
          ? meta.chartPreviousClose 
          : undefined;
        
        if (livePrice !== undefined && livePrice !== null) {
          const currentAsset = marketDataCache[symbol];
          if (currentAsset) {
            currentAsset.price = parseFloat(livePrice);
            
            // Calculate 24h change dynamically based on previous close if not directly available from metadata
            if (prevClose !== undefined && prevClose !== null && prevClose !== 0) {
              const changePercent = ((livePrice - prevClose) / prevClose) * 100;
              currentAsset.change24h = parseFloat(changePercent.toFixed(2));
            }

            // High & Low can be extracted from meta or the first quote data
            const quote = resultObj?.indicators?.quote?.[0];
            const highVal = quote?.high?.[0];
            const lowVal = quote?.low?.[0];
            const volVal = quote?.volume?.[0];

            if (highVal !== undefined && highVal !== null) {
              currentAsset.high24h = parseFloat(highVal);
            } else if (meta.regularMarketDayHigh !== undefined && meta.regularMarketDayHigh !== null) {
              currentAsset.high24h = parseFloat(meta.regularMarketDayHigh);
            } else {
              currentAsset.high24h = parseFloat((livePrice * 1.01).toFixed(symbol === "USDJPY" || currentAsset.category !== "forex" ? 2 : 4));
            }

            if (lowVal !== undefined && lowVal !== null) {
              currentAsset.low24h = parseFloat(lowVal);
            } else if (meta.regularMarketDayLow !== undefined && meta.regularMarketDayLow !== null) {
              currentAsset.low24h = parseFloat(meta.regularMarketDayLow);
            } else {
              currentAsset.low24h = parseFloat((livePrice * 0.99).toFixed(symbol === "USDJPY" || currentAsset.category !== "forex" ? 2 : 4));
            }

            // Update Volume label
            if (currentAsset.category === 'crypto') {
              let volUnit = symbol.replace("USDT", "");
              let rawVol = volVal || Math.floor(Math.random() * 20000) + 5000;
              let formattedVol = rawVol > 1000000 
                ? `${(rawVol / 1000000).toFixed(1)}M ${volUnit}`
                : `${(rawVol / 1000).toFixed(1)}K ${volUnit}`;
              currentAsset.volume = formattedVol;
            } else if (currentAsset.category === 'stock') {
              let rawVol = volVal || Math.floor(Math.random() * 50000000) + 10000000;
              let formattedVol = rawVol > 1000000
                ? `${(rawVol / 1000050).toFixed(1)}M Shares`
                : `${(rawVol / 1000).toFixed(1)}K Shares`;
              currentAsset.volume = formattedVol;
            } else {
              currentAsset.volume = "Volume: High";
            }

            currentAsset.lastUpdated = new Date().toISOString();
          }
        }
      }
    } else {
      console.warn(`Yahoo Finance fetch failed for ${symbol} with status ${response.status}`);
    }
  } catch (error) {
    console.error(`Error updating ${symbol} from Yahoo Finance:`, error);
  }
}

async function fetchBinanceLivePrice(symbol: string) {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
    if (response.ok) {
      const data: any = await response.json();
      const currentAsset = marketDataCache[symbol];
      if (currentAsset && data.lastPrice) {
        currentAsset.price = parseFloat(data.lastPrice);
        if (data.priceChangePercent) {
          currentAsset.change24h = parseFloat(parseFloat(data.priceChangePercent).toFixed(2));
        }
        if (data.highPrice) currentAsset.high24h = parseFloat(data.highPrice);
        if (data.lowPrice) currentAsset.low24h = parseFloat(data.lowPrice);
        if (data.volume) {
          let volUnit = symbol.replace("USDT", "");
          let rawVol = parseFloat(data.volume);
          currentAsset.volume = rawVol > 1000000 
            ? `${(rawVol / 1000000).toFixed(1)}M ${volUnit}`
            : `${(rawVol / 1000).toFixed(1)}K ${volUnit}`;
        }
        currentAsset.lastUpdated = new Date().toISOString();
        return true;
      }
    }
  } catch (error) {
    console.error(`Error updating ${symbol} from Binance live:`, error);
  }
  return false;
}

async function updateAllMarketPrices() {
  const symbols = Object.keys(marketDataCache);
  const promises = symbols.map(async (sym) => {
    if (sym.endsWith("USDT")) {
      const success = await fetchBinanceLivePrice(sym);
      if (success) return;
    }
    await fetchYahooFinanceTicker(sym);
  });
  await Promise.all(promises);
}

// Micro-fluctuate stock prices & forex to mock high-fidelity ticking feeds between polls
function fluctuatePrices() {
  const assetsToFluctuate = ["AAPL", "MSFT", "TSLA", "NVDA", "EURUSD", "GBPUSD", "USDJPY"];
  assetsToFluctuate.forEach(symbol => {
    const asset = marketDataCache[symbol];
    if (asset) {
      const isForex = asset.category === "forex";
      const isJPY = symbol === "USDJPY";
      
      const pct = (Math.random() * 0.04 - 0.02) / 100; // -0.02% to +0.02% to keep price super stable
      asset.price = parseFloat((asset.price * (1 + pct)).toFixed(isForex ? (isJPY ? 2 : 4) : 2));
      
      if (asset.price > asset.high24h) asset.high24h = asset.price;
      if (asset.price < asset.low24h) asset.low24h = asset.price;
      
      asset.lastUpdated = new Date().toISOString();
    }
  });

  // Also marginally bounce crypto around their baseline between feeds
  ["BTCUSDT", "ETHUSDT", "SOLUSDT"].forEach(symbol => {
    const asset = marketDataCache[symbol];
    if (asset) {
      const pct = (Math.random() * 0.02 - 0.01) / 100;
      asset.price = parseFloat((asset.price * (1 + pct)).toFixed(2));
      asset.lastUpdated = new Date().toISOString();
    }
  });
}

// Background Alert Rule Checking
function checkAlertRules() {
  userCreatedAlerts.forEach(alert => {
    if (!alert.isActive) return;
    const asset = marketDataCache[alert.symbol];
    if (!asset) return;

    let triggered = false;
    let message = "";

    if (alert.type === "price_above" && asset.price >= alert.target) {
      triggered = true;
      message = `${asset.name} (${alert.symbol}) price breached Target $${alert.target} (Current: $${asset.price.toLocaleString(undefined, { minimumFractionDigits: alert.category === 'forex' ? 4 : 2 })})`;
    } else if (alert.type === "price_below" && asset.price <= alert.target) {
      triggered = true;
      message = `${asset.name} (${alert.symbol}) price dropped below Target $${alert.target} (Current: $${asset.price.toLocaleString(undefined, { minimumFractionDigits: alert.category === 'forex' ? 4 : 2 })})`;
    } else if (alert.type === "sentiment_above" && asset.sentimentScore >= alert.target) {
      triggered = true;
      message = `${asset.name} (${alert.symbol}) AI Sentiment score rose above Target threshold of ${alert.target} (Current: ${asset.sentimentScore})`;
    } else if (alert.type === "sentiment_below" && asset.sentimentScore <= alert.target) {
      triggered = true;
      message = `${asset.name} (${alert.symbol}) AI Sentiment score plummeted below Target threshold of ${alert.target} (Current: ${asset.sentimentScore})`;
    }

    if (triggered) {
      alert.isActive = false;
      alert.isTriggered = true;
      alert.triggeredAt = new Date().toISOString();
      alert.triggerMessage = message;

      // Unshift a live audit log
      const logId = `l-user-${Date.now()}`;
      liveAlertLogs.unshift({
        id: logId,
        symbol: alert.symbol,
        message: message,
        type: alert.type.startsWith("price") ? "success" : "danger",
        timestamp: new Date().toISOString()
      });

      // Keep logs list trimmed to 30 items max
      if (liveAlertLogs.length > 30) liveAlertLogs.pop();

      // Store in triggers history
      alertHistory.unshift({ ...alert });
    }
  });
}

// Trigger interval clocks
setInterval(updateAllMarketPrices, 15000);
setInterval(fluctuatePrices, 4000);
setInterval(checkAlertRules, 4000);
setInterval(generateArbitrageOpportunities, 6000);

// Kickstart initial values
updateAllMarketPrices();
generateArbitrageOpportunities();

// --- REST API ENDPOINTS ---

// Fetch metadata and current rates for dashboard
app.get("/api/market-data", (req, res) => {
  return res.json({
    assets: Object.values(marketDataCache),
    isGeminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY")
  });
});

// GET /api/arbitrage - Retrieve live calculated spreads and accumulated profits
app.get("/api/arbitrage", (req, res) => {
  return res.json({
    opportunities: activeArbitrageOpportunities,
    accumulatedProfit: accumulatedArbitrageProfit,
  });
});

// POST /api/arbitrage/execute - Simulates low-latency asset order routing, updates total earned, triggers live log
app.post("/api/arbitrage/execute", (req, res) => {
  const { opportunityId } = req.body;
  const opp = activeArbitrageOpportunities.find(o => o.id === opportunityId);
  if (!opp) {
    return res.status(404).json({ error: "Opportunity expired, market spread corrected." });
  }

  const profit = opp.estimatedProfit;
  accumulatedArbitrageProfit = parseFloat((accumulatedArbitrageProfit + profit).toFixed(2));

  // Connect to live portfolio wallet for seamless real-time settlement
  if (walletBalances["USD"]) {
    walletBalances["USD"].balance = parseFloat((walletBalances["USD"].balance + profit).toFixed(2));
    
    walletTransactions.unshift({
      id: `tx-arb-${Date.now()}`,
      walletSymbol: "USD",
      walletName: "US Dollar",
      type: "deposit",
      amount: profit,
      timestamp: new Date().toISOString(),
      status: "completed",
      destinationOrSource: `Arbitrage Yield (via ${opp.sourceExchange} ➜ ${opp.targetExchange})`
    });
    
    if (walletTransactions.length > 50) {
      walletTransactions.pop();
    }
  }

  // Construct descriptive log entry of capturing cross-exchange pricing spread
  const logMessage = `Captured cross-exchange arbitrage gap on ${opp.symbol}: Bought ${opp.tradeSize} units on ${opp.sourceExchange} ($${opp.sourcePrice}) and instantly filled on ${opp.targetExchange} ($${opp.targetPrice}) for direct risk-free payout of +$${profit.toLocaleString()}`;

  // Log in system stream
  liveAlertLogs.unshift({
    id: `l-arb-${Date.now()}`,
    symbol: opp.symbol,
    message: logMessage,
    type: "success",
    timestamp: new Date().toISOString()
  });

  if (liveAlertLogs.length > 30) {
    liveAlertLogs.pop();
  }

  // Remove used opportunity from queue
  activeArbitrageOpportunities = activeArbitrageOpportunities.filter(o => o.id !== opportunityId);

  return res.json({
    success: true,
    profit,
    accumulatedProfit: accumulatedArbitrageProfit,
    message: logMessage
  });
});


// Fetch high-fidelity Recharts historical trends
app.get("/api/historical-data/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const interval = (req.query.interval as string) || "1h"; // e.g. 5m, 15m, 1h, 4h, 1d
  const asset = marketDataCache[symbol];
  if (!asset) {
    return res.status(404).json({ error: "Asset not found" });
  }

  // Fetch real data from Binance if crypto
  if (asset.category === "crypto") {
    try {
      let binanceInterval = "1h";
      if (["5m", "15m", "1h", "4h", "1d"].includes(interval)) {
        binanceInterval = interval;
      }
      const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=24`;
      const response = await fetch(binanceUrl);
      if (response.ok) {
        const rawKlines = await response.json();
        const pts = rawKlines.map((k: any) => {
          const openVal = parseFloat(k[1]);
          const highVal = parseFloat(k[2]);
          const lowVal = parseFloat(k[3]);
          const closeVal = parseFloat(k[4]);
          const d = new Date(k[0]);
          
          let timeLabel = "";
          if (interval === "1d") {
            timeLabel = d.toLocaleDateString([], { month: "short", day: "2-digit" });
          } else if (interval === "4h") {
            timeLabel = `${d.toLocaleDateString([], { month: "short", day: "2-digit" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
          } else {
            timeLabel = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
          }

          return {
            time: timeLabel,
            open: openVal,
            high: highVal,
            low: lowVal,
            close: closeVal,
            price: closeVal, // closing price
            volume: parseFloat(k[5])  // volume
          };
        });
        return res.json(pts);
      }
    } catch (e) {
      console.warn(`Failed to fetch Binance klines for ${symbol}, fallback active`, e);
    }
  }

  // Stock & Forex real historical data fetch via Yahoo Finance
  const yahooSymbol = yahooSymbolMap[symbol];
  if (yahooSymbol) {
    try {
      let range = "5d";
      let yfInterval = "1h";

      if (interval === "5m") {
        range = "1d";
        yfInterval = "5m";
      } else if (interval === "15m") {
        range = "2d";
        yfInterval = "15m";
      } else if (interval === "1h") {
        range = "5d";
        yfInterval = "1h";
      } else if (interval === "4h") {
        range = "7d";
        yfInterval = "1h"; // fetch 1h, then group
      } else if (interval === "1d") {
        range = "3mo";
        yfInterval = "1d";
      }

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${yfInterval}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      });

      if (response.ok) {
        const data: any = await response.json();
        const resultObj = data?.chart?.result?.[0];
        const timestamps = resultObj?.timestamp || [];
        const quote = resultObj?.indicators?.quote?.[0] || {};
        const opens = quote.open || [];
        const highs = quote.high || [];
        const lows = quote.low || [];
        const closes = quote.close || [];
        const volumes = quote.volume || [];

        const points: any[] = [];
        const displayDecimal = asset.category === 'forex' ? (symbol === 'USDJPY' ? 2 : 4) : 2;

        for (let i = 0; i < timestamps.length; i++) {
          const t = timestamps[i];
          const o = opens[i];
          const h = highs[i];
          const l = lows[i];
          const c = closes[i];
          const v = volumes[i];

          // Skip invalid points
          if (t === null || t === undefined || o === null || o === undefined || c === null || c === undefined) {
            continue;
          }

          const itemDate = new Date(t * 1000);
          let timeLabel = "";
          if (interval === "1d") {
            timeLabel = itemDate.toLocaleDateString([], { month: "short", day: "2-digit" });
          } else if (interval === "4h" || interval === "1h") {
            timeLabel = `${itemDate.toLocaleDateString([], { month: "short", day: "2-digit" })} ${itemDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
          } else {
            timeLabel = itemDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          }

          points.push({
            time: timeLabel,
            open: parseFloat(o.toFixed(displayDecimal)),
            high: parseFloat((h !== null && h !== undefined ? h : o).toFixed(displayDecimal)),
            low: parseFloat((l !== null && l !== undefined ? l : o).toFixed(displayDecimal)),
            close: parseFloat(c.toFixed(displayDecimal)),
            price: parseFloat(c.toFixed(displayDecimal)),
            volume: v !== null && v !== undefined ? parseInt(v) : Math.floor(Math.random() * 2000)
          });
        }

        if (points.length > 0) {
          let finalPoints = points;
          if (interval === "4h") {
            finalPoints = points.filter((_, idx) => idx % 4 === 0);
          }
          if (finalPoints.length > 24) {
            finalPoints = finalPoints.slice(-24);
          }
          
          // Guarantee final close exactly matches current live price
          const lastIdx = finalPoints.length - 1;
          const livePrice = asset.price;
          finalPoints[lastIdx].close = livePrice;
          finalPoints[lastIdx].price = livePrice;
          finalPoints[lastIdx].high = parseFloat(Math.max(finalPoints[lastIdx].high, livePrice).toFixed(displayDecimal));
          finalPoints[lastIdx].low = parseFloat(Math.min(finalPoints[lastIdx].low, livePrice).toFixed(displayDecimal));

          return res.json(finalPoints);
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch Yahoo Finance historical chart for ${symbol}, falling back to generator:`, e);
    }
  }

  // Fallback Stock & Forex historical generator
  const basePrice = asset.price;
  const points = [];
  let currentVal = basePrice * (0.975 + Math.random() * 0.01); 
  
  let deltaMs = 3600 * 1000;
  if (interval === "5m") deltaMs = 5 * 60 * 1000;
  else if (interval === "15m") deltaMs = 15 * 60 * 1000;
  else if (interval === "1h") deltaMs = 3600 * 1000;
  else if (interval === "4h") deltaMs = 4 * 3600 * 1000;
  else if (interval === "1d") deltaMs = 24 * 3600 * 15 * 1000;

  for (let i = 0; i < 24; i++) {
    const walkChange = 1 + (Math.random() * 0.016 - 0.007);
    const pathCoverage = i / 23;
    const walkedVal = currentVal * walkChange * (1 - pathCoverage) + basePrice * pathCoverage;
    
    const displayDecimal = asset.category === 'forex' ? (symbol === 'USDJPY' ? 2 : 4) : 2;
    const itemDate = new Date(Date.now() - (24 - i) * deltaMs);
    
    let timeLabel = "";
    if (interval === "1d") {
      timeLabel = itemDate.toLocaleDateString([], { month: "short", day: "2-digit" });
    } else if (interval === "4h") {
      timeLabel = `${itemDate.toLocaleDateString([], { month: "short", day: "2-digit" })} ${itemDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    } else {
      timeLabel = itemDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    
    const openValue = currentVal;
    const closeValue = walkedVal;
    
    const minOC = Math.min(openValue, closeValue);
    const maxOC = Math.max(openValue, closeValue);
    const highValue = maxOC * (1 + Math.random() * 0.004);
    const lowValue = minOC * (1 - Math.random() * 0.004);

    currentVal = walkedVal;

    points.push({
      time: timeLabel,
      open: parseFloat(openValue.toFixed(displayDecimal)),
      high: parseFloat(highValue.toFixed(displayDecimal)),
      low: parseFloat(lowValue.toFixed(displayDecimal)),
      close: parseFloat(closeValue.toFixed(displayDecimal)),
      price: parseFloat(closeValue.toFixed(displayDecimal)),
      volume: Math.floor(Math.random() * 8000) + 1200
    });
  }

  const lastIndex = points.length - 1;
  points[lastIndex].close = basePrice;
  points[lastIndex].price = basePrice;
  points[lastIndex].high = parseFloat(Math.max(points[lastIndex].high, basePrice).toFixed(asset.category === 'forex' ? (symbol === 'USDJPY' ? 2 : 4) : 2));
  points[lastIndex].low = parseFloat(Math.min(points[lastIndex].low, basePrice).toFixed(asset.category === 'forex' ? (symbol === 'USDJPY' ? 2 : 4) : 2));

  return res.json(points);
});

// Create trading alerts
app.get("/api/alerts", (req, res) => {
  return res.json({
    active: userCreatedAlerts.filter(a => a.isActive),
    history: alertHistory
  });
});

app.post("/api/alerts", (req, res) => {
  const { symbol, type, target } = req.body;
  const asset = marketDataCache[symbol];
  if (!asset) {
    return res.status(404).json({ error: "Linked asset symbol not found for alert" });
  }

  const newAlert = {
    id: `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    symbol,
    category: asset.category,
    type,
    target: parseFloat(target),
    isActive: true,
    isTriggered: false,
    createdAt: new Date().toISOString()
  };

  userCreatedAlerts.unshift(newAlert);

  // audit log for adding alert
  liveAlertLogs.unshift({
    id: `l-admin-${Date.now()}`,
    symbol: symbol,
    message: `New watch rule successfully deployed: ${type.toUpperCase().replace('_', ' ')} ${target}`,
    type: "info",
    timestamp: new Date().toISOString()
  });

  return res.status(201).json(newAlert);
});

app.delete("/api/alerts/:id", (req, res) => {
  const { id } = req.params;
  const exists = userCreatedAlerts.some(a => a.id === id);
  if (!exists) {
    return res.status(404).json({ error: "Alert index not found" });
  }

  userCreatedAlerts = userCreatedAlerts.filter(a => a.id !== id);
  return res.json({ success: true });
});

app.get("/api/logs", (req, res) => {
  return res.json(liveAlertLogs);
});

// Mock database for simulated non-public/corporate insider transactions, SEC filings & whale wallet feeds
const insiderLogsBySymbol: { [symbol: string]: any[] } = {
  "BTCUSDT": [
    { id: "ins-btc-1", actor: "Institutional Custody Account", title: "Institutional Whales", type: "buy", action: "Accumulated 4,850 BTC directly into Coinbase Cold Custody Vault", qty: "$331.8M", impact: 85, age: "4 hours ago" },
    { id: "ins-btc-2", actor: "Tether Treasury Multisig", title: "Liquidity Distributor", type: "transfer", action: "Dispatched 1.5 Billion freshly minted USD₮ to primary Binance & OKX trading pools", qty: "1.5B USDT", impact: 70, age: "12 hours ago" },
    { id: "ins-btc-3", actor: "Crypto Regulatory Advisor", title: "Policy Leak Desk", type: "leak", action: "Internal briefing notes convey preliminary SEC approval on broad institutional staking index definitions", qty: "Internal Memo", impact: 80, age: "1 day ago" }
  ],
  "ETHUSDT": [
    { id: "ins-eth-1", actor: "Vitalik Buterin Wallet", title: "Ethereum Co-Founder", type: "transfer", action: "Transferred 12,000 ETH to multi-signature developer grants & R&D reserve smart contracts", qty: "$42.1M", impact: 10, age: "6 hours ago" },
    { id: "ins-eth-2", actor: "Lido Network Validator Nodes", title: "Staking Whales", type: "buy", action: "Locked up 82,000 new ETH under smart contract staking arrangements", qty: "$288M value", impact: 75, age: "18 hours ago" },
    { id: "ins-eth-3", actor: "CFTC Legislative Advisor", type: "leak", action: "Draft regulatory response maintains consistent stance classifying ETH commodity properties directly", qty: "Draft Guideline", impact: 65, age: "2 days ago" }
  ],
  "SOLUSDT": [
    { id: "ins-sol-1", actor: "Solana Foundation Multisig", title: "Ecosystem Builder", type: "transfer", action: "Allocated 150,000 SOL grand incentive pool specifically to high-performance AI agent infrastructures", qty: "$24.7M value", impact: 60, age: "3 hours ago" },
    { id: "ins-sol-2", actor: "OTC Whales Desk Block Trade", title: "Liquidity Provider", type: "buy", action: "Filled major dark pool block swap order at premium of +1.5% to preserve order book depth", qty: "88,000 SOL", impact: 70, age: "9 hours ago" },
    { id: "ins-sol-3", actor: "Liquid Staking Protocols", title: "Validation Nodes", type: "buy", action: "Lock-up agreements of 450,000 SOL extended by validators for next 365 calendar days", qty: "$74.1M asset", impact: 80, age: "1 day ago" }
  ],
  "EURUSD": [
    { id: "ins-eur-1", actor: "ECB Policy Council Board Member", title: "Advisor Leak", type: "leak", action: "Confidential communications outline high consensus to maintain target discount rates stable across Q3", qty: "Internal Minutes", impact: 65, age: "5 hours ago" },
    { id: "ins-eur-2", actor: "Deutsche Bank Forex Desk", title: "Institutional Order Desk", type: "block_trade", action: "Massive corporate commercial export hedge block currency flow completely filled", qty: "€350M Spot", impact: 35, age: "15 hours ago" }
  ],
  "GBPUSD": [
    { id: "ins-gbp-1", actor: "Bank of England Fiscal Board", title: "Interim Policy Leak", type: "leak", action: "Split vote registers surprise hawkish stance on currency credits backstops due to inflation concerns", qty: "Briefing Draft", impact: 60, age: "8 hours ago" },
    { id: "ins-gbp-2", actor: "Barclays Capital FX Desk", title: "Block Trader Broker", type: "block_trade", action: "Cleared large UK sovereign pensions offshore hedging USD acquisition mandate", qty: "£180M Spot", impact: 40, age: "1 day ago" }
  ],
  "USDJPY": [
    { id: "ins-jpy-1", actor: "Bank of Japan Desk Liaison", title: "Policy Planner Leak", type: "leak", action: "Internal policy draft sketches aggressive Yen support plans on short-term market imbalances", qty: "Draft Memorandum", impact: -85, age: "2 hours ago" },
    { id: "ins-jpy-2", actor: "Ministry of Finance Bureaucracy", title: "State Reserves Manager", type: "transfer", action: "Discreet foreign reserve capital liquidity transferred into offshore Federal Reserve deposit locations", qty: "¥450 Billion", impact: -45, age: "10 hours ago" }
  ],
  "AAPL": [
    { id: "ins-aapl-1", actor: "Tim Cook (CEO)", title: "Executive Officer", type: "sell", action: "Liquidated 55,000 shares under a pre-established SEC Rule 10b5-1 executive disposal scheme", qty: "$10.1M value", impact: -15, age: "1 day ago" },
    { id: "ins-aapl-2", actor: "Sabih Khan (SVP Operations)", title: "Corporate Insider", type: "buy", action: "Exercised and retained vested equity stock directly inside long-term capital accounts", qty: "12,500 shares", impact: 60, age: "3 days ago" },
    { id: "ins-aapl-3", actor: "Institutional Dark Pool", title: "Block Liquidity", type: "buy", action: "Sizable institutional block buywall discovered at $182.50 base support area", qty: "$140M cash", impact: 70, age: "4 days ago" }
  ],
  "MSFT": [
    { id: "ins-msft-1", actor: "Satya Nadella (CEO)", title: "Executive Officer", type: "sell", action: "Disposed of 20,000 shares under pre-established executive Rule 10b5-1 (retains 98% of overall holdings)", qty: "$8.3M value", impact: -5, age: "12 hours ago" },
    { id: "ins-msft-2", actor: "Kathleen Hogan (Chief HR)", title: "Corporate Insider", type: "buy", action: "Direct open market stock acquisition reported on SEC Form 4 and fully authorized", qty: "2,500 shares", impact: 45, age: "2 days ago" },
    { id: "ins-msft-3", actor: "Azure Enterprise AI Sales", title: "Strategic Contract Leak", type: "leak", action: "Unannounced cloud agreement pipelines specify 3 major top-tier corporate exclusive AI migrations starting next month", qty: "Confidential NDA list", impact: 90, age: "3 days ago" }
  ],
  "TSLA": [
    { id: "ins-tsla-1", actor: "Elon Musk (CEO / Technoking)", title: "Major Shareholder", type: "transfer", action: "Transferred 1.5M shares into private holding Trust as security margin pledge (no active disposal)", qty: "1.5M shares", impact: -10, age: "1 day ago" },
    { id: "ins-tsla-2", actor: "Kimbal Musk (Board Director)", title: "Board Director", type: "buy", action: "Acquired new shares via options exercise and committed to immediate long-term lockup tier", qty: "5,000 shares", impact: 55, age: "2 days ago" },
    { id: "ins-tsla-3", actor: "Austin Gigafactory Production Desk", title: "Internal Inventory Leak", type: "leak", action: "Production logs demonstrate supply bottlenecks for premium cell materials resolved 2 weeks ahead of target", qty: "Internal status", impact: 85, age: "4 days ago" }
  ],
  "NVDA": [
    { id: "ins-nvda-1", actor: "Jensen Huang (CEO)", title: "Executive Officer", type: "sell", action: "Sold 120,000 options/shares under planned Rule 10b5-1 program (historically normal scheduled event)", qty: "$109.2M value", impact: -10, age: "5 hours ago" },
    { id: "ins-nvda-2", actor: "Colette Kress (CFO)", title: "Executive Officer", type: "buy", action: "Direct open market stock purchase following seasonal advisory clearance", qty: "15,000 shares", impact: 80, age: "1 day ago" },
    { id: "ins-nvda-3", actor: "TSMC Foundry Supply Chain Logistics", title: "Supplier Foundry Leak", type: "leak", action: "Wafer allocation planning documents reflect Nvidia Blackwell prioritizations shifted upwards by 22%", qty: "Production CSV", impact: 95, age: "2 days ago" }
  ]
};

// GET /api/insider-info/:symbol - Fetch interactive insider and block trades records
app.get("/api/insider-info/:symbol", (req, res) => {
  const { symbol } = req.params;
  const logs = insiderLogsBySymbol[symbol] || [];
  return res.json(logs);
});

// --- WALLET ACTIONS DATABASE AND ROUTING ---
interface WalletItem {
  symbol: string;
  name: string;
  category: 'fiat' | 'crypto';
  balance: number;
  addressOrAccount: string;
  network?: string;
}

interface WalletTransaction {
  id: string;
  walletSymbol: string;
  walletName: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  timestamp: string;
  status: 'completed' | 'pending';
  destinationOrSource: string;
  txHash?: string;
}

let walletBalances: { [symbol: string]: WalletItem } = {
  "USD": { symbol: "USD", name: "US Dollar", category: "fiat", balance: 15450.00, addressOrAccount: "Chase Bank •••• 8492" },
  "BTC": { symbol: "BTC", name: "Bitcoin", category: "crypto", balance: 0.145, addressOrAccount: "bc1qxy2kg3ut7k8dhv8epv2t4j3l6r5x9p8v3f3e", network: "Bitcoin Mainnet" },
  "ETH": { symbol: "ETH", name: "Ethereum", category: "crypto", balance: 1.82, addressOrAccount: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", network: "Ethereum Network (ERC-20)" },
  "SOL": { symbol: "SOL", name: "Solana", category: "crypto", balance: 14.50, addressOrAccount: "HN7cABviY3tH9FFz2H2D4T6DFF9x1S3DFA8f3SdfA", network: "Solana Mainnet" }
};

let walletTransactions: WalletTransaction[] = [
  { id: "tx-1", walletSymbol: "USD", walletName: "US Dollar", type: "deposit", amount: 10000.00, timestamp: new Date(Date.now() - 3600 * 24 * 3 * 1000).toISOString(), status: "completed", destinationOrSource: "ACH Transfer (Chase Bank)" },
  { id: "tx-2", walletSymbol: "ETH", walletName: "Ethereum", type: "deposit", amount: 1.5, timestamp: new Date(Date.now() - 3600 * 24 * 2 * 1000).toISOString(), status: "completed", destinationOrSource: "External Address (0x3f5c...)", txHash: "0x3a9a7bcf7b2fb216e91bf97bc5b2f2160918ca1bef772ffbeee11824cf96bc75" },
  { id: "tx-3", walletSymbol: "USD", walletName: "US Dollar", type: "withdrawal", amount: 50.00, timestamp: new Date(Date.now() - 3600 * 12 * 1000).toISOString(), status: "completed", destinationOrSource: "Express Withdrawal (Debit Card •••• 2910)" }
];

const generateTxHash = () => {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
};

// GET /api/wallet - Get wallet balances and transactions history
app.get("/api/wallet", (req, res) => {
  return res.json({
    wallets: Object.values(walletBalances),
    transactions: walletTransactions
  });
});

// POST /api/wallet/deposit - Wallet depositer
app.post("/api/wallet/deposit", (req, res) => {
  const { walletSymbol, amount, details } = req.body;
  const wallet = walletBalances[walletSymbol];
  
  if (!wallet) {
    return res.status(404).json({ error: "Wallet not found for symbol." });
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: "Deposit amount must be a positive number." });
  }

  wallet.balance = parseFloat((wallet.balance + numAmount).toFixed(wallet.category === "crypto" ? 6 : 2));

  const txHash = wallet.category === "crypto" ? generateTxHash() : undefined;
  const newTx: WalletTransaction = {
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    walletSymbol,
    walletName: wallet.name,
    type: 'deposit',
    amount: numAmount,
    timestamp: new Date().toISOString(),
    status: 'completed',
    destinationOrSource: details || (wallet.category === "crypto" ? "Inbound Chain Block Transfer" : "Bank Transfer"),
    txHash
  };

  walletTransactions.unshift(newTx);

  // Add a systemic log
  liveAlertLogs.unshift({
    id: `l-wallet-${Date.now()}`,
    symbol: walletSymbol,
    message: `Wallet Deposit Success: Credited +${numAmount} ${walletSymbol} to your portfolio via ${newTx.destinationOrSource}.` + (txHash ? ` TxHash: ${txHash.slice(0, 10)}...` : ''),
    type: "success",
    timestamp: new Date().toISOString()
  });

  if (liveAlertLogs.length > 30) liveAlertLogs.pop();

  return res.json({
    success: true,
    wallets: Object.values(walletBalances),
    transactions: walletTransactions
  });
});

// POST /api/wallet/withdraw - Wallet withdrawal
app.post("/api/wallet/withdraw", (req, res) => {
  const { walletSymbol, amount, addressOrAccount } = req.body;
  const wallet = walletBalances[walletSymbol];

  if (!wallet) {
    return res.status(404).json({ error: "Wallet not found for symbol." });
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: "Withdrawal amount must be a positive number." });
  }

  if (wallet.balance < numAmount) {
    return res.status(400).json({ error: `Insufficient balance. Available: ${wallet.balance} ${walletSymbol}.` });
  }

  wallet.balance = parseFloat((wallet.balance - numAmount).toFixed(wallet.category === "crypto" ? 6 : 2));

  const txHash = wallet.category === "crypto" ? generateTxHash() : undefined;
  const newTx: WalletTransaction = {
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    walletSymbol,
    walletName: wallet.name,
    type: 'withdrawal',
    amount: numAmount,
    timestamp: new Date().toISOString(),
    status: 'completed',
    destinationOrSource: addressOrAccount || (wallet.category === "crypto" ? "Outbound Transaction Fill" : "Bank Payout"),
    txHash
  };

  walletTransactions.unshift(newTx);

  // Add a systemic log
  liveAlertLogs.unshift({
    id: `l-wallet-${Date.now()}`,
    symbol: walletSymbol,
    message: `Wallet Withdrawal Processed: Sent ${numAmount} ${walletSymbol} directly to ${newTx.destinationOrSource}.` + (txHash ? ` TxHash: ${txHash.slice(0, 10)}...` : ''),
    type: "warning",
    timestamp: new Date().toISOString()
  });

  if (liveAlertLogs.length > 30) liveAlertLogs.pop();

  return res.json({
    success: true,
    wallets: Object.values(walletBalances),
    transactions: walletTransactions
  });
});

// Detailed AI-Driven Sentiment Analysis & Predictions via Google Search Grounding
app.post("/api/analyze-asset", async (req, res) => {
  const { symbol } = req.body;
  const asset = marketDataCache[symbol];
  if (!asset) {
    return res.status(404).json({ error: "Market asset not found" });
  }

  const insiderLogs = insiderLogsBySymbol[symbol] || [];
  const insiderSummaryText = insiderLogs
    .map(log => `- [Insider Trade '${log.type}'] By ${log.actor} (${log.title}): Action taken is "${log.action}", quantity size: ${log.qty}, relative sentiment weight score: ${log.impact}/100`)
    .join("\n");

  const geminiKey = process.env.GEMINI_API_KEY;
  const isKeyEmpty = !geminiKey || geminiKey === "MY_GEMINI_API_KEY" || geminiKey.trim() === "";

  if (isKeyEmpty) {
    // Elegant simulated fallback so the platform runs flawlessly during trial
    const simulatedLabel = asset.sentimentLabel;
    const recommendation = asset.predictionLabel;
    const support = parseFloat((asset.price * 0.965).toFixed(asset.category === 'forex' ? (symbol === 'USDJPY' ? 2 : 4) : 2));
    const resistance = parseFloat((asset.price * 1.035).toFixed(asset.category === 'forex' ? (symbol === 'USDJPY' ? 2 : 4) : 2));

    const simAnalysis = {
      symbol,
      sentimentScore: asset.sentimentScore,
      sentimentLabel: simulatedLabel,
      recommendation,
      confidence: asset.predictionConfidence,
      summary: `[DEMO ANALYST INSIGHT] Connect your live GEMINI_API_KEY in the Settings > Secrets board to enable full-fidelity Google Search Grounding analyst lookups. Right now, ${asset.name} (${symbol}) maintains support around ${support}. In addition, our team evaluated current non-public insider filings & whale alerts, noting that key actors (such as Colette Kress, Sabih Khan, or heavy institutional block OTC transactions) are demonstrating cumulative support. Moving averages specify continuing bullish structure.`,
      keyFactors: [
        "Strong psychological support at current technical base levels.",
        "Positive trend reinforcement backed by corporate insider purchases and strong OTC block orders.",
        "Social engagement forums show building momentum ahead of major catalyst events."
      ],
      support,
      resistance,
      shortTermOutlook: `Short-term consolidation with strong upward bias in the next 48-72 hours within the boundaries of ${support} and ${resistance}.`,
      sources: [
        { title: "AI Studio Secret Configuration Guide", url: "https://ai.studio/build" }
      ],
      lastAnalyzed: new Date().toISOString()
    };

    return res.json({ analysis: simAnalysis, isSimulated: true });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const categoryText = asset.category === 'crypto' ? 'cryptocurrency token' : asset.category === 'forex' ? 'forex trading currency pair' : 'corporate equity share';
    const systemPrompt = `You are a financial analyst specializing in technical indicator metrics, macro global news context, insider trade logs, and real-time sentiment analysis for ${categoryText} instruments. Your reports must be factual, objective, data-rich based strictly on recent Google Search inputs and supplementary insider trade logs, and output perfectly structural JSON.`;
    
    const userPrompt = `Develop an objective, high-fidelity technical and sentiment analysis prediction report for ${asset.name} (${symbol}).
Current reference ticker: $${asset.price}.

Supplementary non-public corporate insider filings, SEC Form 4 data, and whale wallet block transfers tracked for this asset:
${insiderSummaryText}

Leverage Google Search grounding to scan the absolute latest current news highlights, earnings releases, analyst actions, and regulatory developments within the past week.
Synthesize the above insider data with search results to produce a comprehensive rating.
Compose:
1. An overarching Sentiment Score (0–100, where 0 is deeply bearish, 50 neutral, 100 bullish).
2. Sentiment Label (either 'Strong Bullish', 'Bullish', 'Neutral', 'Bearish', or 'Strong Bearish').
3. Trading prediction recommendation ('BUY', 'SELL', or 'HOLD') and confidence percent (0-100).
4. Detailed research summary (2 to 3 factual paragraphs) describing primary fundamental news catalysts, macro events, and general flow sentiment. Explicitly mention these insider/whale logs when describing institutional flows in your summary.
5. Provide exactly 3 major driving factors or upcoming risks.
6. Calculate immediate support and resistance tech target lines based on search-grounded charts or immediate reference data.
7. Provide a concise 1-sentence forecast prediction outlook representing the next 48 to 72 hour trading interval.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            symbol: { type: Type.STRING },
            sentimentScore: { type: Type.NUMBER },
            sentimentLabel: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            keyFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            support: { type: Type.NUMBER },
            resistance: { type: Type.NUMBER },
            shortTermOutlook: { type: Type.STRING },
            sources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING }
                },
                required: ["title", "url"]
              }
            }
          },
          required: [
            "symbol", "sentimentScore", "sentimentLabel", "recommendation", "confidence",
            "summary", "keyFactors", "support", "resistance", "shortTermOutlook", "sources"
          ]
        },
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });

    if (response && response.text) {
      const resultObj = JSON.parse(response.text.trim());

      // Propagate updated sentiment state back to our real-time engine cache
      asset.sentimentScore = typeof resultObj.sentimentScore === 'number' ? resultObj.sentimentScore : asset.sentimentScore;
      if (['Strong Bullish', 'Bullish', 'Neutral', 'Bearish', 'Strong Bearish'].includes(resultObj.sentimentLabel)) {
        asset.sentimentLabel = resultObj.sentimentLabel;
      }
      if (['BUY', 'SELL', 'HOLD'].includes(resultObj.recommendation)) {
        asset.predictionLabel = resultObj.recommendation;
      }
      asset.predictionConfidence = typeof resultObj.confidence === 'number' ? resultObj.confidence : asset.predictionConfidence;
      asset.lastUpdated = new Date().toISOString();

      // Collect URLs from groundingChunks to back up analysis sources
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && Array.isArray(chunks)) {
        const extraCitations = chunks
          .filter(chunk => chunk.web && chunk.web.uri)
          .map(chunk => ({
            title: chunk.web.title || "Grounded Research Story",
            url: chunk.web.uri
          }));
        if (extraCitations.length > 0) {
          resultObj.sources = [...(resultObj.sources || []), ...extraCitations].slice(0, 6);
        }
      }

      resultObj.lastAnalyzed = new Date().toISOString();
      return res.json({ analysis: resultObj, isSimulated: false });
    } else {
      throw new Error("Received blank output text stream from Google Gemini API Model.");
    }
  } catch (err: any) {
    console.error("Gemini Asset Analyzer Engine Failed:", err);
    return res.status(500).json({ error: err?.message || "Internal analysis Engine failure." });
  }
});


// Mounting Vite Development Mode Server Middleware
async function startWebapp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Financial Alerts & Predictions Platform is live on host interface port ${PORT}`);
  });
}

startWebapp();
