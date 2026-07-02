import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import GraphCanvas from './GraphCanvas';
import Legend from './Legend';
import ActionPanel from './ActionPanel';
import NodeActions from './NodeActions';
import './GraphModule.css';
import { Calendar, X } from 'lucide-react';
import { getRole } from '../../roleStore';

const GraphModule = ({ caseDetails }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [logs, setLogs] = useState([]);
  const canvasRef = useRef(null);
  const role = getRole();

  if (!caseDetails) return null;

  const { case: caseData, graph, timeline = [] } = caseDetails;

  const nodes = useMemo(() => Array.isArray(graph?.nodes) ? graph.nodes : [], [graph?.nodes]);
  const edges = useMemo(() => Array.isArray(graph?.edges) ? graph.edges : [], [graph?.edges]);

  const addLog = (action, target, description) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setLogs((prev) => [
      { time, action, target, description },
      ...prev
    ]);
  };

  const handleTraceMoneyFlow = useCallback(() => {
    if (selectedNode && canvasRef.current) {
      canvasRef.current.traceMoneyFlow(selectedNode.id);
      addLog('TRACE', selectedNode.id, `Traced money flow path downstream from selected account node.`);
    }
  }, [selectedNode]);

  const handleExpandNetwork = useCallback(() => {
    if (selectedNode && canvasRef.current) {
      canvasRef.current.expandNetwork(selectedNode.id);
      addLog('EXPAND', selectedNode.id, `Expanded neighborhood topology to 2 hops for target node.`);
    }
  }, [selectedNode]);

  const handleHighlightSuspicious = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.highlightSuspicious(60);
      addLog('HIGHLIGHT', 'GLOBAL', `Highlighted suspicious nodes with risk rating >= 60 in red.`);
    }
  }, []);

  const handleClearHighlights = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.clearHighlights();
      addLog('RESET', 'GLOBAL', `Cleared all custom path filters and highlighted nodes.`);
    }
  }, []);

  const handleLogClick = useCallback((nodeId) => {
    if (canvasRef.current?.highlightNode) {
      canvasRef.current.highlightNode(nodeId, 1500);
    }
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden relative">
      
      {/* Graph Area */}
      <div className="flex-1 relative flex flex-col h-full">
        
        {/* Floating Legend */}
        <Legend />

        {/* Canvas */}
        <div className="flex-1 w-full h-full">
          <GraphCanvas 
            ref={canvasRef} 
            nodes={nodes} 
            edges={edges} 
            onNodeClick={setSelectedNode} 
          />
        </div>

        {/* Selected Node Details Card */}
        {selectedNode && (
          <div className="absolute bottom-5 left-5 bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow-2xl z-40 max-w-sm w-80 backdrop-blur-md animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">Target Selection</span>
                <h4 className="text-xs font-mono font-bold text-white truncate max-w-[180px] mt-0.5" title={selectedNode.id}>
                  {selectedNode.label || selectedNode.id}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedNode(null)} 
                className="text-slate-500 hover:text-slate-300"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5 text-[11px] mb-4">
              <div className="bg-slate-900/60 p-2 rounded border border-slate-850/50">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Node Type</span>
                <span className="font-semibold text-slate-300 capitalize">{selectedNode.nodeType}</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-850/50">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Risk Rating</span>
                <span className="font-semibold text-slate-300">{selectedNode.risk}%</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTraceMoneyFlow}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded text-[10px] shadow-sm transition-all"
              >
                Trace Flow
              </button>
              <button
                onClick={handleExpandNetwork}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-1.5 px-3 rounded text-[10px] transition-all border border-slate-750"
              >
                2-Hop Expand
              </button>
            </div>
          </div>
        )}

        {/* Floating Timeline Overlay Drawer */}
        {showTimeline && (
          <div className="absolute inset-y-0 left-0 w-96 bg-slate-950/95 border-r border-slate-900 shadow-2xl z-50 p-6 flex flex-col gap-4 backdrop-blur-md animate-in slide-in-from-left-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-900">
              <h3 className="text-xs uppercase font-black text-slate-400 tracking-wider flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-400" /> Case Timeline Audit
              </h3>
              <button onClick={() => setShowTimeline(false)} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 relative pl-3 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-850">
              {timeline.map((evt, idx) => (
                <div key={idx} className="relative text-[11px]">
                  <div className={`absolute -left-4 top-1 w-2 h-2 rounded-full border bg-slate-950 ${
                    evt.risk_flag ? "border-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)] bg-red-500/20" : "border-slate-700"
                  }`} />
                  <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg space-y-1">
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>{evt.date} {evt.time}</span>
                      <span className="font-mono">{evt.channel}</span>
                    </div>
                    <p className="font-bold text-slate-200">{evt.event}</p>
                    <p className="text-[10px] text-slate-400 truncate">Party: {evt.counterparty}</p>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="text-slate-500 italic text-center py-8">No timeline transactions found.</p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Side Action Panel */}
      <div className="w-80 h-full shrink-0">
        <ActionPanel
          caseId={caseData.case_id}
          selectedNode={selectedNode}
          onTraceMoneyFlow={handleTraceMoneyFlow}
          onExpandNetwork={handleExpandNetwork}
          onToggleTimeline={() => setShowTimeline(!showTimeline)}
          onHighlightSuspicious={handleHighlightSuspicious}
          onClearHighlights={handleClearHighlights}
          logs={logs}
          onLogClick={handleLogClick}
        />
      </div>

    </div>
  );
};

export default GraphModule;
