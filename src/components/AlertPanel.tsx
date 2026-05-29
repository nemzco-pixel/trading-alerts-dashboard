import React, { useState } from "react";
import { Plus, Trash2, CheckCircle2, Clock, Bell, ShieldQuestion } from "lucide-react";
import { TradingAlert, MarketAsset } from "../types";

interface AlertPanelProps {
  assets: MarketAsset[];
  activeAlerts: TradingAlert[];
  historyAlerts: TradingAlert[];
  onCreateAlert: (alert: { symbol: string; type: string; target: number }) => void;
  onDeleteAlert: (id: string) => void;
}

export function AlertPanel({
  assets,
  activeAlerts,
  historyAlerts,
  onCreateAlert,
  onDeleteAlert,
}: AlertPanelProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(assets[0]?.symbol || "BTCUSDT");
  const [alertType, setAlertType] = useState<string>("price_above");
  const [targetValue, setTargetValue] = useState<string>("");

  const activeAsset = assets.find(a => a.symbol === selectedSymbol);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue || isNaN(parseFloat(targetValue))) return;
    onCreateAlert({
      symbol: selectedSymbol,
      type: alertType,
      target: parseFloat(targetValue),
    });
    setTargetValue("");
  };

  const getAlertDescription = (type: string, target: number, isForex: boolean) => {
    const decimals = isForex ? 4 : 2;
    switch (type) {
      case "price_above": return `Price exceeds $${target.toLocaleString(undefined, { minimumFractionDigits: decimals })}`;
      case "price_below": return `Price drops below $${target.toLocaleString(undefined, { minimumFractionDigits: decimals })}`;
      case "sentiment_above": return `AI Sentiment rises above ${target}%`;
      case "sentiment_below": return `AI Sentiment is below ${target}%`;
      default: return "";
    }
  };

  const getAssetDecimals = (symbol: string) => {
    const ass = assets.find(a => a.symbol === symbol);
    return ass?.category === 'forex' ? (symbol === 'USDJPY' ? 2 : 4) : 2;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 flex flex-col h-full" id="alert-panel-container">
      <div>
        <h2 className="font-display text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-500 animate-pulse" />
          Trading Alerts Center
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Deploy automated AI triggers to monitor key technical and sentiment deviations.</p>
      </div>

      {/* Alert Creator Form */}
      <form onSubmit={handleSubmit} className="mt-6 bg-slate-50/70 border border-slate-100/80 rounded-xl p-4 flex flex-col gap-3.5" id="alert-creator-form">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Set Intelligent Watch Rule</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Instrument</label>
            <select
              id="alert-select-symbol"
              value={selectedSymbol}
              onChange={(e) => {
                setSelectedSymbol(e.target.value);
                setTargetValue("");
              }}
              className="w-full text-xs font-semibold p-2 bg-white border border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 rounded-lg outline-none cursor-pointer"
            >
              {assets.map((asset) => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.symbol} ({asset.category.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Trigger Condition</label>
            <select
              id="alert-select-type"
              value={alertType}
              onChange={(e) => {
                setAlertType(e.target.value);
                setTargetValue("");
              }}
              className="w-full text-xs font-semibold p-2 bg-white border border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 rounded-lg outline-none cursor-pointer"
            >
              <option value="price_above">Price is Above</option>
              <option value="price_below">Price is Below</option>
              <option value="sentiment_above">AI Sentiment Above</option>
              <option value="sentiment_below">AI Sentiment Below</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
              Target Value {activeAsset && `(Current: ${activeAsset.price.toLocaleString(undefined, { minimumFractionDigits: getAssetDecimals(activeAsset.symbol) })}${alertType.includes("sentiment") ? "% Score" : ""})`}
            </label>
            <input
              id="alert-target-value-input"
              type="text"
              required
              placeholder={alertType.includes("sentiment") ? "e.g., 75 (Score)" : activeAsset?.price.toString() || "e.g. 150.00"}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="w-full text-xs font-mono font-medium p-2 bg-white border border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 focus:outline-none rounded-lg"
            />
          </div>
          <button
            id="alert-create-submit"
            type="submit"
            className="self-end p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors shadow-sm font-semibold text-xs h-[34px] px-3.5 gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Deploy rule
          </button>
        </div>
      </form>

      {/* Tabs list for Active / Historical logs */}
      <div className="mt-6 flex-1 flex flex-col gap-4">
        {/* Pending Alerts Block */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Active Surveillance ({activeAlerts.length})
          </h3>
          <div className="space-y-2 max-h-[160px] overflow-y-auto" id="active-surveillance-list">
            {activeAlerts.length > 0 ? (
              activeAlerts.map((alert) => {
                const isForex = alert.category === 'forex';
                return (
                  <div
                    key={alert.id}
                    className="p-3 bg-indigo-50/10 border border-indigo-150/40 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-gray-900">{alert.symbol}</span>
                        <span className="text-[9px] uppercase font-semibold text-indigo-500 bg-indigo-50 px-1 rounded border border-indigo-100">
                          {alert.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {getAlertDescription(alert.type, alert.target, isForex)}
                      </p>
                    </div>
                    <button
                      id={`delete-alert-${alert.id}`}
                      onClick={() => onDeleteAlert(alert.id)}
                      className="p-1 px-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                      title="Recall Alert Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-gray-400 flex flex-col items-center justify-center gap-1">
                <ShieldQuestion className="w-5 h-5 opacity-40" />
                <span className="text-[10px] font-medium uppercase tracking-wider">No watch conditions deployed</span>
              </div>
            )}
          </div>
        </div>

        {/* Historical Triggered Alerts Block */}
        <div className="flex-1 flex flex-col min-h-[140px]">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Hist. Triggers Log ({historyAlerts.slice(0, 10).length})
          </h3>
          <div className="flex-1 overflow-y-auto max-h-[220px] bg-slate-50/30 border border-gray-150/50 rounded-xl p-2 space-y-2" id="triggered-historical-list">
            {historyAlerts.length > 0 ? (
              historyAlerts.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className="p-2.5 bg-white border border-gray-150/60 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-gray-900">{alert.symbol}</span>
                    <span className="text-[9px] font-mono text-gray-400">
                      {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 leading-snug font-medium">
                    {alert.triggerMessage || `Alert met: condition exceeded target value of ${alert.target}`}
                  </p>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-center text-gray-400 py-8">
                <span className="text-[10px] font-medium uppercase tracking-wider">No triggered alerts on record</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
