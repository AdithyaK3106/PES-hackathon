import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertOctagon, HelpCircle } from 'lucide-react';

export default function EvidenceSidebar({ evidenceList = [] }) {
  return (
    <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
      <h4 className="text-[10px] text-slate-500 uppercase font-black tracking-wider flex items-center gap-1.5 pl-1 mb-1">
        <AlertOctagon size={12} className="text-amber-500" /> Evidence Collected
      </h4>

      {evidenceList.length === 0 && (
        <div className="text-[10px] text-slate-600 italic pl-1">
          No patterns or anomalies mapped yet.
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence>
          {evidenceList.map((item, idx) => (
            <motion.div
              key={item.id || idx}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 100 }}
              className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col gap-1 relative overflow-hidden"
            >
              {/* Colored border indicator by severity */}
              <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                item.severity?.toUpperCase() === 'CRITICAL' ? 'bg-red-500' :
                item.severity?.toUpperCase() === 'HIGH' ? 'bg-orange-500' : 'bg-amber-500'
              }`} />

              <div className="flex justify-between items-start pl-1.5">
                <span className="font-mono font-bold text-[11px] text-white tracking-wide">
                  ✓ {item.name}
                </span>
                <span className={`text-[8px] px-1.5 py-0.2 rounded font-black border font-mono ${
                  item.severity?.toUpperCase() === 'CRITICAL' ? 'bg-red-950/20 text-red-400 border-red-900/30' :
                  item.severity?.toUpperCase() === 'HIGH' ? 'bg-orange-950/20 text-orange-400 border-orange-900/30' :
                  'bg-amber-950/20 text-amber-400 border-amber-900/30'
                }`}>
                  {item.severity || 'HIGH'}
                </span>
              </div>

              <p className="text-[10px] text-slate-400 font-mono mt-1 pl-1.5">
                Amount: ₹{new Intl.NumberFormat('en-IN').format(Number(item.amount || 0))}
              </p>

              <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mt-1 pl-1.5 pt-1.5 border-t border-slate-900/60">
                <span>Confidence: <strong className="text-slate-350">{item.confidence}%</strong></span>
                <span>Tx Count: <strong className="text-slate-350">{item.affectedTransactions}</strong></span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
