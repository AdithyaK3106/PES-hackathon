import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ShieldAlert, Award, FileSpreadsheet } from 'lucide-react';

export default function CaseClosurePanel({
  transactionCount,
  entityCount,
  patternCount,
  confidence,
  riskLevel,
  onRestart,
  onDismiss
}) {
  return (
    <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[3px] z-50 flex items-center justify-center pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
        className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden text-slate-200"
      >
        {/* Animated green gradient header stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-red-500" />
        
        {/* Decorative ambient background light */}
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-indigo-500/5 rounded-full blur-2xl" />

        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-900">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white font-sans">
              Investigation Complete
            </h3>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
              Forensic analysis finalized
            </p>
          </div>
        </div>

        {/* Detailed Metrics List */}
        <div className="space-y-2.5 font-mono text-[10px] mb-5">
          <div className="flex justify-between items-center py-2 px-3 bg-slate-900/40 rounded-lg border border-slate-850">
            <span className="text-slate-500 uppercase">Transactions Analysed</span>
            <span className="font-bold text-white text-xs">{transactionCount}</span>
          </div>

          <div className="flex justify-between items-center py-2 px-3 bg-slate-900/40 rounded-lg border border-slate-850">
            <span className="text-slate-500 uppercase">Entities Extracted</span>
            <span className="font-bold text-white text-xs">{entityCount}</span>
          </div>

          <div className="flex justify-between items-center py-2 px-3 bg-slate-900/40 rounded-lg border border-slate-850">
            <span className="text-slate-500 uppercase">Patterns Confirmed</span>
            <span className="font-bold text-amber-400 text-xs">{patternCount}</span>
          </div>

          <div className="flex justify-between items-center py-2 px-3 bg-slate-900/40 rounded-lg border border-slate-850">
            <span className="text-slate-500 uppercase">Investigation Confidence</span>
            <span className="font-bold text-emerald-400 text-xs">{confidence}%</span>
          </div>

          <div className="flex justify-between items-center py-2 px-3 bg-slate-900/40 rounded-lg border border-slate-850">
            <span className="text-slate-500 uppercase">Overall Risk Rating</span>
            <span className={`font-bold text-xs uppercase ${
              riskLevel?.toUpperCase() === 'CRITICAL' ? 'text-red-400' :
              riskLevel?.toUpperCase() === 'HIGH' ? 'text-orange-400' : 'text-amber-400'
            }`}>
              {riskLevel || 'CRITICAL'}
            </span>
          </div>
        </div>

        {/* Action Recommendation Alert */}
        <div className="bg-red-950/20 border border-red-900/30 text-red-300 p-3.5 rounded-xl mb-6 text-[10px] leading-relaxed flex items-start gap-2.5 shadow-sm shadow-red-950/20">
          <ShieldAlert size={14} className="shrink-0 text-red-400 mt-0.5 animate-pulse" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[9px] block text-red-400 mb-0.5">Recommendation</span>
            Immediate Financial Investigation Recommended
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={onRestart}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-350 font-bold py-2 rounded-xl text-[10px] border border-slate-800 transition-all active:scale-95 font-sans"
          >
            Watch Again
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-[10px] transition-all active:scale-95 shadow-md shadow-indigo-950/40 font-sans"
          >
            Explore Network
          </button>
        </div>
      </motion.div>
    </div>
  );
}
