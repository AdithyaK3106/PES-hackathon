import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Compass, ZoomIn, FileText, Calendar, ShieldAlert, 
  XCircle, ArrowRightLeft, RefreshCw, HelpCircle
} from 'lucide-react';
import InvestigationLog from './InvestigationLog';

export default function ActionPanel({
  caseId,
  selectedNode,
  onTraceMoneyFlow,
  onExpandNetwork,
  onToggleTimeline,
  onHighlightSuspicious,
  onClearHighlights,
  logs = [],
  onLogClick
}) {
  const navigate = useNavigate();

  return (
    <aside className="w-full bg-slate-950 border-l border-slate-900 flex flex-col p-6 gap-6 h-full text-xs">
      
      {/* Title */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-900">
        <h3 className="text-xs uppercase font-black text-slate-500 tracking-wider">
          Forensic Toolkit
        </h3>
        <span className="text-[10px] font-bold text-slate-600 font-mono">v2.0L-REST</span>
      </div>

      {/* Case ID and Selected Node */}
      <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl space-y-3">
        <div>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">Active Investigation</span>
          <span className="text-sm font-mono font-bold text-white leading-none mt-0.5 block">{caseId}</span>
        </div>
        
        <div className="border-t border-slate-850 pt-3">
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">Selected Target Node</span>
          {selectedNode ? (
            <div className="flex justify-between items-center mt-1">
              <div>
                <p className="text-xs font-mono font-bold text-indigo-400 truncate max-w-[150px]" title={selectedNode.id}>
                  {selectedNode.label || selectedNode.id}
                </p>
                <p className="text-[9px] text-slate-500 capitalize">{selectedNode.nodeType}</p>
              </div>
              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-850 font-bold text-[9px] text-slate-300">
                Risk: {selectedNode.risk}%
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-600 italic mt-1">
              Click any node in graph to unlock targeted actions
            </p>
          )}
        </div>
      </div>

      {/* Investigation Tools Section */}
      <div className="space-y-3 flex-1">
        <h4 className="text-[10px] text-slate-500 uppercase font-black tracking-wider block pl-1">
          Investigation Tools
        </h4>

        {/* Node specific tools */}
        <div className="space-y-2">
          <button 
            onClick={onTraceMoneyFlow}
            disabled={!selectedNode}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg text-xs shadow-md transition-all disabled:pointer-events-none"
          >
            <Compass size={14} />
            Trace Money Flow
          </button>

          <button 
            onClick={onExpandNetwork}
            disabled={!selectedNode}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 disabled:opacity-50 text-slate-350 font-bold py-2.5 px-4 rounded-lg text-xs transition-all disabled:pointer-events-none"
          >
            <ZoomIn size={14} />
            Expand Network (2 Hops)
          </button>
        </div>

        {/* Global tools */}
        <div className="space-y-2 pt-2 border-t border-slate-900">
          <button 
            onClick={onHighlightSuspicious}
            className="w-full flex items-center justify-center gap-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 font-bold py-2.5 px-4 rounded-lg text-xs transition-all"
          >
            <ShieldAlert size={14} />
            Highlight Suspicious Node/Edge (&gt;60)
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={onToggleTimeline}
              className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold py-2 px-3 rounded-lg text-[11px] transition-all"
            >
              <Calendar size={13} />
              Timeline
            </button>
            <button 
              onClick={onClearHighlights}
              className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold py-2 px-3 rounded-lg text-[11px] transition-all"
            >
              <XCircle size={13} />
              Reset View
            </button>
          </div>

          <button 
            onClick={() => navigate(`/report/${caseId}`)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-lg text-xs shadow-md shadow-blue-950/30 transition-all"
          >
            <FileText size={14} />
            Generate Investigation Report
          </button>
        </div>
      </div>

      {/* Investigation Log */}
      <div className="border-t border-slate-900 pt-4 mt-auto">
        <InvestigationLog logs={logs} onLogClick={onLogClick} />
      </div>

    </aside>
  );
}
