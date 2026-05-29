import { useState, useEffect, FormEvent } from "react";
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  History, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  AlertCircle, 
  X, 
  Plus, 
  ChevronRight, 
  CircleDollarSign,
  FileSpreadsheet,
  RefreshCw,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { WalletItem, WalletTransaction } from "../types";


interface WalletPanelProps {
  onClose?: () => void;
  // Options to update parent/app state if needed
  onWalletUpdated?: () => void;
}

export function WalletPanel({ onClose, onWalletUpdated }: WalletPanelProps) {
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'balances' | 'deposit' | 'withdraw' | 'history'>('balances');
  
  // Selection states
  const [selectedWalletSymbol, setSelectedWalletSymbol] = useState<string>("USD");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositSource, setDepositSource] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawDest, setWithdrawDest] = useState<string>("");
  
  // Feedback states
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Filters for Transactions history
  const [txFilterSymbol, setTxFilterSymbol] = useState<string>("ALL");
  const [txFilterType, setTxFilterType] = useState<string>("ALL");

  const selectedWallet = wallets.find(w => w.symbol === selectedWalletSymbol);

  // Load wallet data from server
  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/wallet");
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets);
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Failed to load wallet metrics", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  // Handle address copy
  const handleCopyAddress = (text: string, symbol: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSymbol(symbol);
    setTimeout(() => setCopiedSymbol(null), 2000);
  };

  // Perform Deposit
  const handleDepositSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const amountNum = parseFloat(depositAmount);
    if (!selectedWalletSymbol) {
      setFormError("Please select a target wallet account.");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError("Please provide a valid positive deposit amount.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletSymbol: selectedWalletSymbol,
          amount: amountNum,
          details: depositSource.trim() || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets);
        setTransactions(data.transactions);
        setFormSuccess(`Successfully deposited +${amountNum} ${selectedWalletSymbol}!`);
        setDepositAmount("");
        setDepositSource("");
        
        if (onWalletUpdated) onWalletUpdated();
        setTimeout(() => {
          setActiveTab('balances');
          setFormSuccess(null);
        }, 1500);
      } else {
        const errData = await res.json();
        setFormError(errData.error || "Failed to make transaction.");
      }
    } catch (e) {
      setFormError("Network communication error.");
    } finally {
      setActionLoading(false);
    }
  };

  // Perform Withdrawal
  const handleWithdrawSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const amountNum = parseFloat(withdrawAmount);
    if (!selectedWalletSymbol) {
      setFormError("Please select a source wallet account.");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError("Please provide a valid positive withdrawal amount.");
      return;
    }
    if (!withdrawDest.trim()) {
      setFormError(selectedWallet?.category === "crypto" 
        ? "Please enter a recipient blockchain wallet address." 
        : "Please enter a valid destination bank routing/account detail."
      );
      return;
    }

    if (selectedWallet && selectedWallet.balance < amountNum) {
      setFormError(`Insufficient funds. Your available balance is ${selectedWallet.balance} ${selectedWalletSymbol}.`);
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletSymbol: selectedWalletSymbol,
          amount: amountNum,
          addressOrAccount: withdrawDest.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets);
        setTransactions(data.transactions);
        setFormSuccess(`Successfully withdrawed ${amountNum} ${selectedWalletSymbol}!`);
        setWithdrawAmount("");
        setWithdrawDest("");
        
        if (onWalletUpdated) onWalletUpdated();
        setTimeout(() => {
          setActiveTab('balances');
          setFormSuccess(null);
        }, 1500);
      } else {
        const errData = await res.json();
        setFormError(errData.error || "Failed to finalize withdrawal.");
      }
    } catch (e) {
      setFormError("Network communication error.");
    } finally {
      setActionLoading(false);
    }
  };

  // Switch to action and pre-select symbol
  const startQuickAction = (action: 'deposit' | 'withdraw', symbol: string) => {
    setSelectedWalletSymbol(symbol);
    setFormError(null);
    setFormSuccess(null);
    setActiveTab(action);
  };

  // Filtered ledger rows
  const filteredTransactions = transactions.filter(tx => {
    if (txFilterSymbol !== "ALL" && tx.walletSymbol !== txFilterSymbol) return false;
    if (txFilterType !== "ALL" && tx.type !== txFilterType) return false;
    return true;
  });

  // Calculate fiat total equivalent estimation
  const totalFiatValuation = wallets.reduce((acc, wallet) => {
    if (wallet.symbol === "USD") return acc + wallet.balance;
    // Rough virtual calculation for high-fidelity totals dashboard
    const virtualRates: { [sym: string]: number } = {
      BTC: 68400,
      ETH: 3510,
      SOL: 165
    };
    const rate = virtualRates[wallet.symbol] || 0;
    return acc + (wallet.balance * rate);
  }, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full text-slate-100" id="wallet-manager-card">
      {/* Tab bar header selection */}
      <div className="border-b border-slate-800 p-4 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-indigo-650 to-indigo-500 p-2 rounded-lg text-white">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-white">Interactive Wallet Manager</h3>
            <p className="text-[11px] text-slate-400 font-medium">Fiat Deposits & Blockchain Outbound Networks</p>
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 px-1.5 rounded-lg border border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-white transition duration-200 self-end sm:self-auto"
            title="Minimize"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* TABS SELECTOR */}
      <div className="flex border-b border-slate-800/50 bg-slate-950/20 px-2.5 pt-1.5 shrink-0 select-none">
        {(['balances', 'deposit', 'withdraw', 'history'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setFormError(null);
                setFormSuccess(null);
              }}
              className={`px-4 py-2.5 text-xs font-semibold capitalize border-b-2 font-display transition duration-200 ${
                isActive 
                  ? "border-indigo-500 text-white font-bold" 
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800"
              }`}
            >
              {tab === 'balances' ? 'My Balances' : tab === 'deposit' ? 'Deposit' : tab === 'withdraw' ? 'Withdraw' : 'Statement History'}
            </button>
          );
        })}
      </div>

      {/* CORE CONTAINER INTERACTIVE */}
      <div className="flex-1 overflow-y-auto min-h-0" id="wallet-interactive-interior">
        {loading ? (
          <div className="h-48 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
            <p className="text-xs font-mono text-slate-500">Retrieving wallet data ledger...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* 1. BALANCES LIST */}
            {activeTab === 'balances' && (
              <motion.div 
                key="tab-balances"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="p-4 md:p-5 space-y-4"
              >
                {/* Balance estimation header overlay card */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Net Portfolio Valuation Estimates</span>
                    <h4 className="text-xl sm:text-2xl font-extrabold font-mono text-white mt-1">
                      ${totalFiatValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-450 bg-emerald-950/40 border border-emerald-900/40 rounded-full px-2.5 py-0.5 inline-flex items-center gap-1 font-mono">
                      <TrendingUp className="w-3 h-3" /> Fully Funded
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {wallets.map((wallet) => {
                    const isCrypto = wallet.category === "crypto";
                    return (
                      <div 
                        key={wallet.symbol} 
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition duration-200 relative group"
                        id={`wallet-cell-${wallet.symbol}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-lg flex items-center justify-center ${
                              wallet.symbol === "USD" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/10" :
                              wallet.symbol === "BTC" ? "bg-amber-950/45 text-amber-500 border border-amber-900/10" :
                              wallet.symbol === "ETH" ? "bg-indigo-950/40 text-indigo-400 border border-indigo-900/10" :
                              "bg-purple-950/40 text-purple-400 border border-purple-900/10"
                            }`}>
                              {wallet.symbol === "USD" ? <CircleDollarSign className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-white font-display group-hover:text-indigo-400 transition duration-200">{wallet.name}</h4>
                              <p className="text-[11px] text-slate-400 font-medium">{isCrypto ? wallet.network : "Fiat Deposit Account"}</p>
                            </div>
                          </div>
                          
                          <span className="text-xs font-extrabold font-mono text-slate-500 bg-slate-950/45 px-2 py-0.5 rounded border border-slate-850">
                            {wallet.symbol}
                          </span>
                        </div>

                        {/* Balance display */}
                        <div className="my-4">
                          <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-bold">Liquid Balance</p>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-mono font-extrabold text-white">
                              {isCrypto 
                                ? wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) 
                                : `$${wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              }
                            </span>
                            {isCrypto && <span className="text-xs font-mono font-bold text-slate-400">{wallet.symbol}</span>}
                          </div>
                        </div>

                        {/* Address view / swift */}
                        <div className="border-t border-slate-800/40 pt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span className="truncate max-w-[170px]" title={wallet.addressOrAccount}>
                            {wallet.addressOrAccount.slice(0, 16)}...
                          </span>
                          <button 
                            onClick={() => handleCopyAddress(wallet.addressOrAccount, wallet.symbol)}
                            className="text-slate-400 hover:text-white inline-flex items-center gap-1 shrink-0 p-1 rounded hover:bg-slate-800 transition duration-150"
                            title="Copy Wallet Coordinate"
                          >
                            {copiedSymbol === wallet.symbol ? (
                              <Check className="w-3.5 h-3.5 text-emerald-450" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Quick Transfer panel overlays (visible on hover or focus) */}
                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                          <button
                            onClick={() => startQuickAction('deposit', wallet.symbol)}
                            className="flex-1 bg-slate-950 hover:bg-slate-850 text-emerald-400 border border-emerald-950 text-[11px] font-extrabold py-1.5 px-2.5 rounded-lg inline-flex items-center justify-center gap-1 hover:border-emerald-900/30 transition duration-150"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" /> Deposit
                          </button>
                          <button
                            onClick={() => startQuickAction('withdraw', wallet.symbol)}
                            className="flex-1 bg-slate-950 hover:bg-slate-850 text-indigo-400 border border-indigo-950 text-[11px] font-extrabold py-1.5 px-2.5 rounded-lg inline-flex items-center justify-center gap-1 hover:border-indigo-900/30 transition duration-150"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" /> Withdraw
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* 2. DEPOSIT FROM WALLET */}
            {activeTab === 'deposit' && (
              <motion.div 
                key="tab-deposit"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="p-4 md:p-5"
              >
                <form onSubmit={handleDepositSubmit} className="space-y-4 max-w-lg mx-auto bg-slate-950/20 p-4 rounded-2xl border border-slate-800/40">
                  <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-850 pb-3">
                    <ArrowDownLeft className="w-5 h-5 text-emerald-450" />
                    <div>
                      <h4 className="font-extrabold text-sm text-white">Fiat or Crypto Capital Deposit</h4>
                      <p className="text-[10px] text-slate-500 font-medium font-mono">Instantly credit funded tickers onto your server node</p>
                    </div>
                  </div>

                  {/* Feedback Blocks */}
                  {formError && (
                    <div className="bg-rose-950/40 border border-rose-900/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-200">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="bg-emerald-950/40 border border-emerald-900/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-200">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  {/* Wallet Asset Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase font-bold tracking-wider text-slate-400 font-mono">Choose Ticker</label>
                    <div className="grid grid-cols-4 gap-2">
                      {wallets.map((w) => (
                        <button
                          key={w.symbol}
                          type="button"
                          onClick={() => {
                            setSelectedWalletSymbol(w.symbol);
                            setFormError(null);
                          }}
                          className={`py-2 px-1 text-xs font-mono font-bold rounded-lg border text-center transition duration-150 ${
                            selectedWalletSymbol === w.symbol
                              ? "bg-indigo-600/10 border-indigo-500 text-indigo-400"
                              : "bg-slate-900 border-slate-850 text-slate-400 hover:text-white hover:bg-slate-850"
                          }`}
                        >
                          {w.symbol}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedWallet && (
                    <div className="bg-slate-900/40 rounded-xl border border-slate-850/60 p-3.5 space-y-3.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Available In-App Balance</span>
                        <span className="text-xs font-mono font-extrabold text-white">
                          {selectedWallet.balance} {selectedWallet.symbol}
                        </span>
                      </div>

                      {selectedWallet.category === 'crypto' ? (
                        <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-slate-950/50 p-2.5 rounded-lg border border-slate-900">
                          {/* Mock QR graphic */}
                          <div className="p-1 px-1.5 bg-white rounded-lg inline-flex items-center justify-center shrink-0">
                            <QrCode className="w-12 h-12 text-slate-950" />
                          </div>
                          <div className="text-left w-full space-y-1 min-w-0">
                            <span className="text-[9px] font-mono uppercase bg-slate-850 text-indigo-400 px-1.5 py-0.5 rounded border border-slate-800 font-bold">
                              Deposit Destination Address ({selectedWallet.network})
                            </span>
                            <div className="flex items-center justify-between gap-1 mt-1 bg-slate-900 border border-slate-850 px-2 py-1 rounded">
                              <span className="text-[10px] font-mono text-slate-300 select-all truncate">
                                {selectedWallet.addressOrAccount}
                              </span>
                              <button 
                                type="button"
                                onClick={() => handleCopyAddress(selectedWallet.addressOrAccount, selectedWallet.symbol)}
                                className="text-slate-400 hover:text-white p-0.5 rounded transition hover:bg-slate-800 shrink-0"
                              >
                                {copiedSymbol === selectedWallet.symbol ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-450" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-950/40 border border-slate-900/60 p-3 rounded-lg text-[11px] leading-relaxed text-slate-400">
                          🏦 Linked Payout Partner: <strong className="text-slate-200">Chase Bank •••• 8492</strong>. We support zero-fee instant electronic settlements with ACH wire approvals.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Amount input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase font-bold tracking-wider text-slate-400 font-mono">Amount to credit</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500 font-mono text-xs font-bold">
                          {selectedWalletSymbol === "USD" ? "$" : selectedWalletSymbol + ":"}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        required
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="e.g. 500.00"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-lg bg-slate-900 text-slate-100 placeholder-slate-500 text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-550 transition duration-150"
                      />
                    </div>
                  </div>

                  {/* Wire/Source Account placeholder input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                      {selectedWallet?.category === "crypto" ? "Inbound Out-Of-App TxHash (Optional Source Address)" : "Debit Card details / Bank Reference"}
                    </label>
                    <input
                      type="text"
                      value={depositSource}
                      onChange={(e) => setDepositSource(e.target.value)}
                      placeholder={selectedWallet?.category === "crypto" ? "e.g. bc1px... or external coinbase tag" : "Chase Bank Savings •• 8492"}
                      className="block w-full py-2 px-3 border border-slate-800 rounded-lg bg-slate-900 text-slate-100 placeholder-slate-500 text-xs font-mono font-medium focus:outline-none focus:border-indigo-500 transition duration-150"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-555 text-white text-xs font-extrabold py-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 shadow shadow-emerald-700/10 disabled:opacity-50 transition duration-200"
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying Bank Settlement...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Credit Inbound Deposit
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* 3. WITHDRAW FUNDS */}
            {activeTab === 'withdraw' && (
              <motion.div 
                key="tab-withdraw"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="p-4 md:p-5"
              >
                <form onSubmit={handleWithdrawSubmit} className="space-y-4 max-w-lg mx-auto bg-slate-950/20 p-4 rounded-2xl border border-slate-800/40">
                  <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-850 pb-3">
                    <ArrowUpRight className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h4 className="font-extrabold text-sm text-white">Outbound Capital Withdrawal</h4>
                      <p className="text-[10px] text-slate-500 font-medium font-mono">Disburse balances to external financial networks</p>
                    </div>
                  </div>

                  {/* Feedback Blocks */}
                  {formError && (
                    <div className="bg-rose-950/40 border border-rose-900/40 rounded-xl p-3 flex flex-row items-start gap-2.5 text-xs text-rose-200">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="bg-emerald-950/40 border border-emerald-900/40 rounded-xl p-3 flex flex-row items-start gap-2.5 text-xs text-emerald-200">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  {/* Wallet Asset Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase font-bold tracking-wider text-slate-400 font-mono">Choose Outbound Asset</label>
                    <div className="grid grid-cols-4 gap-2">
                      {wallets.map((w) => (
                        <button
                          key={w.symbol}
                          type="button"
                          onClick={() => {
                            setSelectedWalletSymbol(w.symbol);
                            setFormError(null);
                          }}
                          className={`py-2 px-1 text-xs font-mono font-bold rounded-lg border text-center transition duration-150 ${
                            selectedWalletSymbol === w.symbol
                              ? "bg-indigo-600/10 border-indigo-500 text-indigo-400"
                              : "bg-slate-900 border-slate-850 text-slate-400 hover:text-white hover:bg-slate-850"
                          }`}
                        >
                          {w.symbol}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedWallet && (
                    <div className="bg-slate-900/40 rounded-xl border border-slate-800/50 p-3 h-auto">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-500 font-bold uppercase text-[10px]">Liquid Balance Available</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-white">
                            {selectedWallet.balance} {selectedWallet.symbol}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setWithdrawAmount(selectedWallet.balance.toString());
                              setFormError(null);
                            }}
                            className="bg-indigo-950/40 text-indigo-400 hover:text-white hover:bg-indigo-900 border border-indigo-950 px-1.5 py-0.5 rounded text-[10px] uppercase font-extrabold font-mono transition duration-150"
                          >
                            Use Max
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Amount withdrawal */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase font-bold tracking-wider text-slate-400 font-mono">Amount to disburse</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500 font-mono text-xs font-bold">
                          {selectedWalletSymbol === "USD" ? "$" : selectedWalletSymbol + ":"}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        required
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="e.g. 100.00"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-lg bg-slate-900 text-slate-100 placeholder-slate-500 text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-550 transition duration-150"
                      />
                    </div>
                  </div>

                  {/* Address destination or Bank details */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                      {selectedWallet?.category === "crypto" ? `Recipient ${selectedWallet.network} Address` : "Recipient Bank routing & account details"}
                    </label>
                    <input
                      type="text"
                      required
                      value={withdrawDest}
                      onChange={(e) => setWithdrawDest(e.target.value)}
                      placeholder={selectedWallet?.category === "crypto" ? "Enter bc1... or 0x... wallet coordinates" : "Fidelity Investments Routing 021000021 Account 8492048"}
                      className="block w-full py-2 px-3 border border-slate-800 rounded-lg bg-slate-900 text-slate-100 placeholder-slate-500 text-xs font-mono font-medium focus:outline-none focus:border-indigo-500 transition duration-150"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-extrabold py-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 shadow shadow-indigo-700/10 disabled:opacity-50 transition duration-200"
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Querying Recipient Bank Ledger...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-4 h-4" /> Authorize Outbound Transfer
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* 4. STATEMENT TRANSACTIONS LOGS */}
            {activeTab === 'history' && (
              <motion.div 
                key="tab-history"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="p-4 md:p-5 flex flex-col h-full min-h-[350px]"
              >
                {/* Statement controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850/60 mb-4 text-xs select-none">
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Asset filter</span>
                      <select 
                        value={txFilterSymbol}
                        onChange={(e) => setTxFilterSymbol(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono font-bold font-sans text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="ALL">All Assets</option>
                        <option value="USD">USD</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                        <option value="SOL">SOL</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Type filter</span>
                      <select 
                        value={txFilterType}
                        onChange={(e) => setTxFilterType(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono font-bold font-sans text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="ALL">All Operations</option>
                        <option value="deposit">Deposits</option>
                        <option value="withdrawal">Withdrawals</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={fetchWalletData} 
                    className="p-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-white border border-slate-800 hover:border-slate-705 rounded-lg inline-flex items-center gap-1.5 self-start sm:self-auto font-bold transition font-mono text-[10px]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Force Sync
                  </button>
                </div>

                {/* Ledger Listing */}
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px] pr-1" id="scrolling-ledger-table">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx) => {
                      const isDeposit = tx.type === "deposit";
                      return (
                        <div 
                          key={tx.id} 
                          className="bg-slate-900/60 border border-slate-850/70 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-slate-800 transition duration-150"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-lg flex items-center justify-center shrink-0 ${
                              isDeposit 
                                ? "bg-emerald-950/40 text-emerald-450 border border-emerald-950" 
                                : "bg-indigo-950/40 text-indigo-400 border border-indigo-950"
                            }`}>
                              {isDeposit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>

                            <div className="min-w-0 text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-white uppercase font-display">
                                  {isDeposit ? "Credit Deposit" : "Debit Withdrawal"}
                                </span>
                                <span className="text-[10px] font-mono font-bold bg-slate-950/70 border border-slate-850 px-1.5 rounded text-slate-400">
                                  {tx.walletSymbol}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5" title={tx.destinationOrSource}>
                                Route: <span className="text-slate-300 font-semibold">{tx.destinationOrSource || "Systemic Exchange"}</span>
                              </p>
                              {tx.txHash && (
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate flex items-center gap-1">
                                  Tx: <span className="text-indigo-400/80">{tx.txHash.slice(0, 18)}...</span>
                                  <button
                                    onClick={() => handleCopyAddress(tx.txHash!, tx.id)}
                                    className="p-0.5 hover:text-white rounded"
                                    title="Copy blockchain TxHash"
                                  >
                                    {copiedSymbol === tx.id ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right column values */}
                          <div className="text-left sm:text-right shrink-0 flex flex-col sm:items-end justify-center">
                            <span className={`font-mono text-sm font-extrabold ${isDeposit ? "text-emerald-400" : "text-white"}`}>
                              {isDeposit ? "+" : "-"}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {tx.walletSymbol}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {new Date(tx.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 border border-dashed border-slate-800/80 rounded-2xl">
                      <FileSpreadsheet className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs font-mono uppercase text-slate-500">No transactions match these statements filters</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* FOOTER DETAIL MOCK BANNER */}
      <div className="border-t border-slate-800 p-3 px-4 bg-slate-950/40 rounded-b-2xl flex items-center justify-between text-[10px] text-slate-500 font-mono shrink-0">
        <span>Instant Settlement Gateways Active</span>
        <span>Secure Secure SSL</span>
      </div>
    </div>
  );
}
