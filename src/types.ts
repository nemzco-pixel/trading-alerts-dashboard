export type AssetCategory = 'crypto' | 'forex' | 'stock';

export interface MarketAsset {
  symbol: string;
  name: string;
  category: AssetCategory;
  price: number;
  change24h: number; // percentage, e.g., 2.34 for +2.34%
  high24h: number;
  low24h: number;
  volume: string;
  sentimentScore: number; // 0 (extreme bearish) to 100 (extreme bullish)
  sentimentLabel: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
  predictionLabel: 'BUY' | 'SELL' | 'HOLD';
  predictionConfidence: number; // 0 to 100 percentage
  lastUpdated: string;
}

export interface HistoricalDataPoint {
  time: string;
  price: number;
  volume?: number;
}

export interface TradingAlert {
  id: string;
  symbol: string;
  category: AssetCategory;
  type: 'price_above' | 'price_below' | 'sentiment_above' | 'sentiment_below';
  target: number;
  isActive: boolean;
  isTriggered: boolean;
  createdAt: string;
  triggeredAt?: string;
  triggerMessage?: string;
}

export interface LiveAlertLog {
  id: string;
  symbol: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  timestamp: string;
}

export interface AssetAnalysis {
  symbol: string;
  sentimentScore: number;
  sentimentLabel: string;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  summary: string;
  keyFactors: string[];
  support: number;
  resistance: number;
  shortTermOutlook: string;
  sources: Array<{ title: string; url: string }>;
  lastAnalyzed: string;
}

export interface InsiderFiling {
  id: string;
  actor: string;
  title: string;
  type: 'buy' | 'sell' | 'leak' | 'transfer' | 'block_trade';
  action: string;
  qty: string;
  impact: number; // -100 to 100
  age: string;
}

export interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  assetName: string;
  sourceExchange: string;
  targetExchange: string;
  sourcePrice: number;
  targetPrice: number;
  spreadPercent: number;
  estimatedProfit: number; // profit per 1 unit traded or on standard trade Size
  tradeSize: number; // standard simulated size e.g. 1 BTC, 10 ETH
  timestamp: string;
}

export interface WalletItem {
  symbol: string;
  name: string;
  category: 'fiat' | 'crypto';
  balance: number;
  addressOrAccount: string;
  network?: string;
}

export interface WalletTransaction {
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

