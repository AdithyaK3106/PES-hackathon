import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { maskAccount } from '../../utils/maskAccount';
import { getRole } from '../../roleStore';

export default function NodeProfilePopup({ nodeData, position, visible }) {
  const role = getRole();
  const isViewer = role !== 'admin';
  
  if (!position) return null;

  const displayAccountId = nodeData ? (nodeData.accountId || nodeData.id || nodeData.account_id) : '';
  const maskedId = isViewer ? maskAccount(displayAccountId) : displayAccountId;

  return (
    <AnimatePresence>
      {visible && nodeData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 5 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute z-45 bg-slate-950/95 border border-red-500/40 rounded-xl p-3 shadow-[0_0_20px_rgba(239,68,68,0.12)] w-60 select-none text-[10px] text-slate-300 font-mono"
          style={{
            left: position.alignLeft ? position.x - 270 : position.x + 30,
            top: position.y - 60,
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500/60" />
          
          <div className="flex justify-between items-center pb-1.5 border-b border-slate-900 mb-2">
            <span className="text-[8px] font-black tracking-wider text-red-400 uppercase">
              Node Interrogation
            </span>
            <span className="font-bold text-red-500 uppercase tracking-widest text-[7px] border border-red-950 bg-red-950/20 px-1 rounded">
              {nodeData.risk >= 70 ? 'Critical' : 'High'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div>
              <span className="text-slate-500 text-[8px] uppercase block">Account ID</span>
              <span className="font-bold text-white block truncate" title={displayAccountId}>
                {maskedId}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-900/60">
              <div>
                <span className="text-slate-500 text-[8px] uppercase block">Inflow</span>
                <span className="font-bold text-emerald-400">
                  ₹{new Intl.NumberFormat('en-IN').format(nodeData.total_inflow || 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[8px] uppercase block">Outflow</span>
                <span className="font-bold text-rose-400">
                  ₹{new Intl.NumberFormat('en-IN').format(nodeData.total_outflow || 0)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-900/60">
              <div>
                <span className="text-slate-500 text-[8px] uppercase block">Tx Count</span>
                <span className="font-bold text-slate-200">
                  {nodeData.tx_count || 1}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[8px] uppercase block">Risk Rating</span>
                <span className="font-bold text-red-400">
                  {nodeData.risk || 40}%
                </span>
              </div>
            </div>

            {nodeData.patternName && (
              <div className="pt-1.5 border-t border-slate-900/60 flex items-center gap-1 text-[9px] text-amber-400">
                <AlertTriangle size={11} className="shrink-0" />
                <span className="font-bold truncate" title={nodeData.patternName}>
                  {nodeData.patternName}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
