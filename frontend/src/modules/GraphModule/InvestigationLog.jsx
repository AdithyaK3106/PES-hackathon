import React from 'react';
import { getRole } from '../../roleStore';
import { maskAccount } from '../../utils/maskAccount';
import { ShieldCheck, ShieldAlert, History } from 'lucide-react';

const InvestigationLog = ({ logs = [], onLogClick }) => {
  const role = getRole();
  const isViewer = role !== 'admin';

  const formatTarget = (target) => {
    if (!target || target === 'GLOBAL' || target === 'SUSPECTS') return target;
    return isViewer ? maskAccount(target) : target;
  };

  const getActionColorCls = (type) => {
    switch (type?.toUpperCase()) {
      case 'TRACE': return 'text-blue-400';
      case 'EXPAND': return 'text-purple-400';
      case 'HIGHLIGHT': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-1">
      <h4 className="text-[10px] text-slate-500 uppercase font-black tracking-wider flex items-center gap-1.5 mb-1">
        <History size={12} className="text-indigo-400" /> Investigation Log
      </h4>
      
      {logs.length === 0 && (
        <div className="text-xs text-slate-600 italic">
          No operations logged. Use tools to begin.
        </div>
      )}

      {logs.map((log, idx) => (
        <div 
          key={idx} 
          onClick={() => log.target && log.target !== 'GLOBAL' && onLogClick && onLogClick(log.target)}
          className={`text-[11px] font-mono p-3 rounded-lg border bg-slate-950/60 border-slate-900 transition-all ${
            log.target && log.target !== 'GLOBAL' ? 'cursor-pointer hover:border-slate-800' : ''
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <div>
              <span className="text-slate-600 font-bold">[{log.time}]</span>{' '}
              <span className={`font-black uppercase ${getActionColorCls(log.action)}`}>{log.action}</span>
            </div>
            {log.target && (
              <span className="text-[9px] bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded font-mono text-slate-400">
                {formatTarget(log.target)}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 italic">{log.description}</p>
        </div>
      ))}
    </div>
  );
};

export default InvestigationLog;
