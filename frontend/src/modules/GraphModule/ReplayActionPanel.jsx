import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Terminal, ArrowRight } from 'lucide-react';
import { maskAccount } from '../../utils/maskAccount';
import { getRole } from '../../roleStore';
import EvidenceSidebar from './EvidenceSidebar';

export default function ReplayActionPanel({
  caseId,
  currentIndex,
  totalSteps,
  currentStep,
  activePatterns = [],
  evidenceList = [],
  logs = [],
  onLogClick
}) {
  const role = getRole();
  const isViewer = role !== 'admin';
  const feedEndRef = useRef(null);

  // Keep logs capped at 12 entries for the narration feed
  const narrationFeed = logs.slice(-12);

  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const formatTarget = (target) => {
    if (!target || target === 'GLOBAL' || target === 'SUSPECTS') return target;
    return isViewer ? maskAccount(target) : target;
  };

  const getActionColorCls = (action) => {
    switch (action?.toUpperCase()) {
      case 'TRACE': return 'text-sky-400';
      case 'PATTERN': return 'text-amber-400 font-bold';
      case 'ENTITY': return 'text-purple-400';
      case 'RISK': return 'text-red-400 font-black';
      case 'CREDIT': return 'text-emerald-400';
      case 'DEBIT': return 'text-rose-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <aside className="w-full bg-slate-950 border-l border-slate-900 flex flex-col p-6 gap-5 h-full text-xs overflow-y-auto select-none">
      
      {/* Replay Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-900 shrink-0">
        <h3 className="text-xs uppercase font-black text-slate-500 tracking-wider flex items-center gap-1.5">
          <Terminal size={14} className="text-indigo-500 animate-pulse" />
          AI Forensic Replay
        </h3>
        <span className="text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-900/50 px-2 py-0.5 rounded font-bold font-mono tracking-widest uppercase">
          Live feed
        </span>
      </div>

      {/* Progress metadata */}
      <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-3 shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">Case Reference</span>
            <span className="text-sm font-mono font-bold text-white block mt-0.5">{caseId}</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">Step Tracker</span>
            <span className="text-xs font-mono font-bold text-slate-300 block mt-0.5">
              {currentIndex + 1} / {totalSteps}
            </span>
          </div>
        </div>
      </div>

      {/* Current Transaction Details */}
      {currentStep ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl relative overflow-hidden transition-all duration-300 shrink-0">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-amber-500 to-red-500" />
          
          <div>
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">Uncovering Transaction</span>
            <div className="text-xl font-mono font-black text-white mt-1">
              ₹{new Intl.NumberFormat('en-IN').format(Number(currentStep.amount || 0))}
            </div>
            <div className="text-[9px] text-slate-500 font-mono mt-0.5">
              {currentStep.date || 'Timestamp not available'}
            </div>
          </div>

          <div className="border-t border-slate-850 pt-3 grid grid-cols-5 items-center gap-1.5">
            <div className="col-span-2 truncate">
              <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Sender</span>
              <span className="font-mono text-[10px] text-slate-300 font-semibold block truncate" title={currentStep.from || currentStep.source}>
                {formatTarget(currentStep.from || currentStep.source)}
              </span>
            </div>
            <div className="col-span-1 flex justify-center text-slate-600">
              <ArrowRight size={14} className="animate-pulse" />
            </div>
            <div className="col-span-2 truncate text-right">
              <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Receiver</span>
              <span className="font-mono text-[10px] text-slate-300 font-semibold block truncate" title={currentStep.to || currentStep.target}>
                {formatTarget(currentStep.to || currentStep.target)}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-850 pt-3 grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-slate-500 block text-[8px] uppercase font-bold">Channel</span>
              <span className="font-semibold text-slate-300 uppercase font-mono">{currentStep.channel || 'OTHER'}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[8px] uppercase font-bold">Transaction Type</span>
              <span className={`font-semibold font-mono ${currentStep.is_debit ? 'text-rose-400' : 'text-emerald-400'}`}>
                {currentStep.is_debit ? 'DEBIT' : 'CREDIT'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/30 border border-slate-900 border-dashed rounded-xl p-6 text-center text-slate-600 italic shrink-0">
          Preparing money trail reconstruction...
        </div>
      )}

      {/* Confirmed Evidence stack */}
      <div className="border-t border-slate-900 pt-4 shrink-0">
        <EvidenceSidebar evidenceList={evidenceList} />
      </div>

      {/* Live AI Narration Feed */}
      <div className="border-t border-slate-900 pt-4 flex-1 flex flex-col min-h-[180px] overflow-hidden">
        <h4 className="text-[10px] text-slate-500 uppercase font-black tracking-wider flex items-center gap-1.5 mb-2 pl-1 shrink-0">
          <Terminal size={12} className="text-indigo-400" /> Live AI Narration Feed
        </h4>
        
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 flex flex-col">
          {logs.length === 0 ? (
            <div className="text-xs text-slate-600 italic py-4 pl-1">
              Replay not started yet.
            </div>
          ) : (
            narrationFeed.map((log, idx) => {
              const isNewest = idx === narrationFeed.length - 1;
              
              return (
                <motion.div 
                  key={log.id || idx}
                  initial={isNewest ? { opacity: 0, y: 15, scale: 0.95 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  onClick={() => log.target && log.target !== 'GLOBAL' && onLogClick && onLogClick(log.target)}
                  className={`text-[10px] font-mono p-2.5 rounded-lg border bg-slate-950/60 border-slate-900/60 transition-all hover:border-slate-800 ${
                    log.target && log.target !== 'GLOBAL' ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="text-slate-600 font-bold">[{log.time}]</span>{' '}
                      <span className={`font-black uppercase tracking-wider text-[9px] ${getActionColorCls(log.action)}`}>
                        {log.action}
                      </span>
                    </div>
                    {log.target && (
                      <span className="text-[8px] bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded font-mono text-slate-400 max-w-[80px] truncate" title={log.target}>
                        {formatTarget(log.target)}
                      </span>
                    )}
                  </div>
                  <p className="text-[9.5px] text-slate-400 italic leading-snug">{log.description}</p>
                </motion.div>
              );
            })
          )}
          <div ref={feedEndRef} />
        </div>
      </div>

    </aside>
  );
}
