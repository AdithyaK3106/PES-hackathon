import React, { useState, useEffect } from 'react';
import { ArrowRight, Clock, Tag } from 'lucide-react';

const formatINR = (val) => {
  const num = Number(val || 0);
  return '₹' + new Intl.NumberFormat('en-IN').format(num);
};

export default function EdgeTooltip({ edge, position }) {
  if (!edge || !position) return null;

  const formattedAmount = formatINR(edge.amount);
  const channel = edge.channel || 'UNKNOWN';
  const timestamp = edge.timestamp || edge.date || 'N/A';

  return (
    <div
      className="fixed bg-slate-950 border border-slate-800 rounded-lg p-3 shadow-2xl z-50 pointer-events-none"
      style={{
        left: `${position.x + 10}px`,
        top: `${position.y + 10}px`,
        maxWidth: '250px',
        animation: 'fadeIn 0.2s ease-in-out'
      }}
    >
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>

      <div className="space-y-2">
        {/* Transaction Amount */}
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-slate-500 uppercase font-black">Amount</span>
          <span className="text-[10px] font-bold text-emerald-400">{formattedAmount}</span>
        </div>

        {/* Channel */}
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-slate-500 uppercase font-black">Channel</span>
          <span className="text-[9px] font-mono font-bold text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded">
            {channel}
          </span>
        </div>

        {/* Direction */}
        <div className="flex items-center gap-2 text-[9px]">
          <ArrowRight size={10} className="text-slate-400" />
          <span className="text-slate-400">From {edge.from || 'Unknown'}</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] pl-[18px]">
          <span className="text-slate-400">To {edge.to || 'Unknown'}</span>
        </div>

        {/* Timestamp */}
        {timestamp !== 'N/A' && (
          <div className="border-t border-slate-900 pt-2 mt-2 flex items-center gap-1.5">
            <Clock size={9} className="text-slate-500" />
            <span className="text-[8px] text-slate-500 font-mono">{timestamp}</span>
          </div>
        )}
      </div>
    </div>
  );
}
