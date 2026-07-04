import React, { useMemo } from 'react';
import {
  X, TrendingUp, TrendingDown, AlertTriangle, Shield,
  Clock, Users, ArrowUpRight, ArrowDownLeft, Tag
} from 'lucide-react';

const formatINR = (val) => {
  const num = Number(val || 0);
  return '₹' + new Intl.NumberFormat('en-IN').format(num);
};

const formatShortINR = (val) => {
  const num = Number(val || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  return formatINR(num);
};

export default function TreeNodeInspector({ node, onClose, onTraceFlow, onExpandNetwork }) {
  if (!node) return null;

  const riskColor = useMemo(() => {
    const r = Number(node.risk || 0);
    if (r >= 70) return { bg: 'bg-red-950/30', text: 'text-red-400', label: 'HIGH RISK' };
    if (r >= 40) return { bg: 'bg-amber-950/30', text: 'text-amber-400', label: 'MEDIUM RISK' };
    return { bg: 'bg-green-950/30', text: 'text-green-400', label: 'LOW RISK' };
  }, [node.risk]);

  const totalInflow = Number(node.total_inflow || 0);
  const totalOutflow = Number(node.total_outflow || 0);
  const netFlow = totalInflow - totalOutflow;

  return (
    <div className="animate-in slide-in-from-right-3 duration-200 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-slate-900 pb-3">
        <div className="min-w-0 flex-1">
          <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider block">Node Details</span>
          <h3 className="text-xs font-mono font-bold text-white truncate mt-0.5 max-w-[240px]" title={node.label}>
            {node.label || node.id}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[9px] bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded font-mono font-medium text-slate-400 uppercase">
              {node.nodeType || node.node_type || 'account'}
            </span>
            {node.id?.includes('Primary') && (
              <span className="text-[8px] bg-blue-950/30 text-blue-400 border border-blue-900/50 px-1.5 py-0.5 rounded font-black tracking-wide uppercase">
                Primary
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-350 p-1 hover:bg-slate-900 rounded transition-all"
        >
          <X size={14} />
        </button>
      </div>

      {/* Risk Gauge */}
      <div className={`border rounded-lg p-3 flex items-center gap-3 ${riskColor.bg}`}>
        <div className="relative flex-shrink-0">
          <svg className="w-12 h-12 rotate-[-90deg]">
            <circle cx="24" cy="24" r="20" stroke="#334155" strokeWidth="3" fill="transparent" />
            <circle
              cx="24" cy="24" r="20"
              stroke={riskColor.text.replace('text-', '')}
              strokeWidth="3"
              fill="transparent"
              strokeDasharray="125"
              strokeDashoffset={125 - (125 * (node.risk || 0)) / 100}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-black font-mono ${riskColor.text}`}>
            {node.risk || 0}%
          </span>
        </div>
        <div>
          <span className="text-[8px] text-slate-500 uppercase font-black block">Risk Score</span>
          <span className={`text-xs font-black tracking-wide uppercase ${riskColor.text}`}>
            {riskColor.label}
          </span>
        </div>
      </div>

      {/* Flow Analysis */}
      <div className="bg-slate-900/20 border border-slate-900 rounded-lg p-3 space-y-2">
        <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider block">Money Flow</span>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-950 border border-slate-900/60 rounded p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownLeft size={12} className="text-emerald-400" />
              <span className="text-[7px] text-slate-500 uppercase font-black">Inflow</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400">{formatShortINR(totalInflow)}</span>
          </div>

          <div className="bg-slate-950 border border-slate-900/60 rounded p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpRight size={12} className="text-red-400" />
              <span className="text-[7px] text-slate-500 uppercase font-black">Outflow</span>
            </div>
            <span className="text-[10px] font-bold text-red-400">{formatShortINR(totalOutflow)}</span>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-900/60 rounded p-2">
          <div className="flex items-center justify-between">
            <span className="text-[7px] text-slate-500 uppercase font-black">Net Flow</span>
            <span className={`text-[10px] font-bold ${netFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {netFlow >= 0 ? '+' : ''}{formatShortINR(Math.abs(netFlow))}
            </span>
          </div>
        </div>
      </div>

      {/* Account Details Grid */}
      <div className="bg-slate-900/20 border border-slate-900 rounded-lg overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-slate-900">
          <div className="bg-slate-950 p-2">
            <span className="text-[7px] text-slate-500 uppercase font-black block">Account ID</span>
            <span className="text-[9px] font-mono font-bold text-slate-300 mt-1 break-all">{node.id}</span>
          </div>

          <div className="bg-slate-950 p-2">
            <span className="text-[7px] text-slate-500 uppercase font-black block">Entity Type</span>
            <span className="text-[9px] font-bold text-slate-300 mt-1 capitalize">{node.nodeType || node.node_type || 'Unknown'}</span>
          </div>

          <div className="bg-slate-950 p-2">
            <span className="text-[7px] text-slate-500 uppercase font-black block">Transactions</span>
            <span className="text-[9px] font-bold text-slate-300 mt-1">{node.tx_count || 0}</span>
          </div>

          <div className="bg-slate-950 p-2">
            <span className="text-[7px] text-slate-500 uppercase font-black block">Status</span>
            <span className="text-[9px] font-bold text-slate-300 mt-1 uppercase">{node.status || 'Active'}</span>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      {node.risk >= 40 && (
        <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} className="text-red-400" />
            <span className="text-[8px] text-red-400 uppercase font-black tracking-wider">Risk Factors</span>
          </div>
          <div className="space-y-1 text-[9px]">
            {node.risk >= 70 && <div className="text-red-400 flex items-center gap-1"><span className="w-1 h-1 bg-red-400 rounded-full" />High-risk beneficiary</div>}
            {totalInflow > 100000 && <div className="text-red-400 flex items-center gap-1"><span className="w-1 h-1 bg-red-400 rounded-full" />Rapid volume inflow</div>}
            {node.risk >= 40 && <div className="text-amber-400 flex items-center gap-1"><span className="w-1 h-1 bg-amber-400 rounded-full" />Medium risk detected</div>}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 border-t border-slate-900 pt-3">
        <button
          onClick={onTraceFlow}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg text-[10px] transition-all"
        >
          <TrendingDown size={12} />
          Trace Downstream Flow
        </button>
        <button
          onClick={onExpandNetwork}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-3 rounded-lg text-[10px] border border-slate-700 transition-all"
        >
          <Users size={12} />
          2-Hop Network Expand
        </button>
      </div>
    </div>
  );
}
