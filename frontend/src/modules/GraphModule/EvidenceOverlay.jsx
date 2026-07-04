import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export default function EvidenceOverlay({ evidence, visible }) {
  return (
    <AnimatePresence>
      {visible && evidence && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] z-50 flex items-center justify-center pointer-events-none select-none"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: -20, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            className="w-full max-w-sm bg-slate-950 border border-amber-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative overflow-hidden text-center"
          >
            {/* Ambient amber glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 animate-pulse">
                <ShieldAlert size={24} />
              </div>

              <div className="space-y-1.5 w-full">
                <span className="text-[10px] font-black tracking-[0.25em] text-amber-500 uppercase block">
                  Evidence Detected
                </span>
                
                {/* Visual dividers resembling terminal printouts */}
                <div className="border-t border-slate-800 my-2" />
                
                <h3 className="text-lg font-black text-white leading-tight font-sans tracking-wide">
                  {evidence.name}
                </h3>
                
                <div className="text-xl font-mono font-black text-amber-400 mt-2">
                  ₹{new Intl.NumberFormat('en-IN').format(Number(evidence.amount || 0))}
                </div>
                
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Affected Tx: {evidence.affectedTransactions} {evidence.affectedTransactions > 1 ? 'Nodes' : 'Node'}
                </p>

                <div className="border-t border-slate-800 my-2" />

                <div className="flex justify-between items-center px-4 py-1.5 bg-slate-900/60 rounded-lg border border-slate-850 font-mono text-[10px]">
                  <span className="text-slate-500 uppercase">Analysis Confidence</span>
                  <span className="font-bold text-amber-400">{evidence.confidence}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
