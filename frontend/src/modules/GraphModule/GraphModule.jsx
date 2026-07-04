import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import GraphCanvas from './GraphCanvas';
import Legend from './Legend';
import ActionPanel from './ActionPanel';
import ReplayController from './ReplayController';
import ReplayActionPanel from './ReplayActionPanel';
import RiskAnimator from './RiskAnimator';
import EvidenceOverlay from './EvidenceOverlay';
import NodeProfilePopup from './NodeProfilePopup';
import CaseClosurePanel from './CaseClosurePanel';
import { getInvestigationNarrative } from './InvestigationDirector';
import './GraphModule.css';
import { Calendar, X } from 'lucide-react';
import { getRole } from '../../roleStore';

const GraphModule = ({ caseDetails }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [logs, setLogs] = useState([]);
  const canvasRef = useRef(null);
  const role = getRole();

  // Replay states
  const [replayActive, setReplayActive] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.5);
  const [replayLogs, setReplayLogs] = useState([]);
  const [currentRiskScore, setCurrentRiskScore] = useState(22);
  const [confidenceScore, setConfidenceScore] = useState(50);
  const [floatingBadges, setFloatingBadges] = useState([]);
  const [showIntro, setShowIntro] = useState(true);
  const [showSummaryCard, setShowSummaryCard] = useState(false);

  const speedRef = useRef(playbackSpeed);

  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Evidence & Node Interrogation overlay states
  const [evidenceList, setEvidenceList] = useState([]);
  const [activeEvidence, setActiveEvidence] = useState(null);
  const [evidenceOverlayVisible, setEvidenceOverlayVisible] = useState(false);
  const [nodeInterrogationVisible, setNodeInterrogationVisible] = useState(false);
  const [interrogatedNodeData, setInterrogatedNodeData] = useState(null);
  const [interrogatedNodePosition, setInterrogatedNodePosition] = useState(null);

  if (!caseDetails) return null;

  const { case: caseData, graph, timeline = [] } = caseDetails;

  const nodes = useMemo(() => Array.isArray(graph?.nodes) ? graph.nodes : [], [graph?.nodes]);
  const edges = useMemo(() => Array.isArray(graph?.edges) ? graph.edges : [], [graph?.edges]);

  const primaryAccountId = useMemo(() => {
    const primaryNode = nodes.find(n => n.nodeType === 'account' || n.node_type === 'account');
    return primaryNode ? String(primaryNode.accountId || primaryNode.id || primaryNode.account_id) : '';
  }, [nodes]);

  const replaySteps = useMemo(() => {
    const edgeList = [...edges];
    const txOrder = caseDetails?.transactions || [];
    
    if (txOrder.length > 0) {
      edgeList.sort((a, b) => {
        const aId = String(a.tx_id || a.id);
        const bId = String(b.tx_id || b.id);
        const aIndex = txOrder.findIndex(t => String(t.tx_id) === aId);
        const bIndex = txOrder.findIndex(t => String(t.tx_id) === bId);
        return aIndex - bIndex;
      });
    }
    return edgeList;
  }, [edges, caseDetails?.transactions]);

  const timelineSteps = useMemo(() => {
    return replaySteps.map(step => {
      const hasPattern = (caseDetails?.patterns || []).some(pat => 
        pat && pat.related_transactions && pat.related_transactions.includes(step.tx_id || step.id)
      );
      return {
        amount: Number(step.amount || 0),
        hasPattern
      };
    });
  }, [replaySteps, caseDetails?.patterns]);

  const formatTxTime = (dateStr) => {
    if (!dateStr) return '09:00';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      const str = String(dateStr);
      const m = str.match(/\b\d{2}:\d{2}\b/);
      return m ? m[0] : '09:00';
    } catch {
      return '09:00';
    }
  };

  const formatTargetName = (nodeId) => {
    const matchingNode = nodes.find(n => String(n.accountId || n.id || n.account_id) === String(nodeId));
    return matchingNode ? (matchingNode.label || nodeId) : nodeId;
  };

  const getCumulativeMetricsForStep = (index, nodeId) => {
    let count = 0;
    let inflow = 0;
    let outflow = 0;
    
    for (let i = 0; i <= index; i++) {
      const edge = replaySteps[i];
      if (!edge) continue;
      const amount = Number(edge.amount || 0);
      const fromAcc = String(edge.source || edge.from);
      const toAcc = String(edge.target || edge.to);
      const targetStr = String(nodeId);
      
      if (fromAcc === targetStr) {
        count++;
        outflow += amount;
      }
      if (toAcc === targetStr) {
        count++;
        inflow += amount;
      }
    }
    
    return { tx_count: count, total_inflow: inflow, total_outflow: outflow };
  };

  const getRiskScoreForStep = (index) => {
    if (index < 0) return 22;
    if (index >= replaySteps.length - 1) return caseData?.risk_score || 91;
    
    const base = 22;
    const maxRisk = caseData?.risk_score || 91;
    const diff = maxRisk - base;
    
    let totalWeight = 0;
    const weights = replaySteps.map(step => {
      const hasPattern = (caseDetails?.patterns || []).some(pat => 
        pat && pat.related_transactions && pat.related_transactions.includes(step.tx_id || step.id)
      );
      return hasPattern ? 3 : 1;
    });
    
    weights.forEach(w => totalWeight += w);
    
    let accumulatedWeight = 0;
    for (let i = 0; i <= index; i++) {
      accumulatedWeight += weights[i];
    }
    
    return Math.round(base + diff * (accumulatedWeight / totalWeight));
  };

  const getConfidenceForStep = (index) => {
    if (index < 0) return 50;
    if (index >= replaySteps.length - 1) return 97;
    
    const base = 50;
    const maxConf = 97;
    const diff = maxConf - base;
    
    let totalWeight = 0;
    const weights = replaySteps.map(step => {
      const hasPattern = (caseDetails?.patterns || []).some(pat => 
        pat && pat.related_transactions && pat.related_transactions.includes(step.tx_id || step.id)
      );
      return hasPattern ? 4 : 1;
    });
    
    weights.forEach(w => totalWeight += w);
    
    let accumulatedWeight = 0;
    for (let i = 0; i <= index; i++) {
      accumulatedWeight += weights[i];
    }
    
    return Math.round(base + diff * (accumulatedWeight / totalWeight));
  };

  const triggerFloatingBadge = (patternName, nodeId) => {
    if (canvasRef.current?.getRenderedPosition) {
      const pos = canvasRef.current.getRenderedPosition(nodeId);
      if (pos) {
        const badgeId = Math.random().toString();
        let displayBadge = patternName;
        if (patternName === 'Rapid Money Movement') displayBadge = 'Rapid Movement';
        
        setFloatingBadges(prev => [...prev, {
          id: badgeId,
          text: `⚠ ${displayBadge}`,
          x: pos.x,
          y: pos.y - 45
        }]);
        setTimeout(() => {
          setFloatingBadges(prev => prev.filter(b => b.id !== badgeId));
        }, 2000);
      }
    }
  };

  // Intro loop
  useEffect(() => {
    if (replayActive) {
      setShowIntro(true);
      setIsPlaying(false);
      setCurrentIndex(-1);
      setReplayLogs([]);
      setEvidenceList([]);
      setCurrentRiskScore(22);
      setConfidenceScore(50);
      setShowSummaryCard(false);

      const timer = setTimeout(() => {
        setShowIntro(false);
        setIsPlaying(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [replayActive, caseDetails]);

  // Autoplay loop effect
  useEffect(() => {
    if (!replayActive || !isPlaying) return;
    if (currentIndex >= replaySteps.length - 1) {
      setIsPlaying(false);
      setShowSummaryCard(true);
      return;
    }
    
    let isCancelled = false;
    
    const run = async () => {
      const nextIndex = currentIndex + 1;
      const step = replaySteps[nextIndex];
      if (!step) return;

      const targetId = String(step.target || step.to);
      let isNewReceiver = true;
      for (let i = 0; i <= currentIndex; i++) {
        const prevStep = replaySteps[i];
        if (String(prevStep.source || prevStep.from) === targetId || String(prevStep.target || prevStep.to) === targetId) {
          isNewReceiver = false;
          break;
        }
      }
      if (targetId === primaryAccountId) {
        isNewReceiver = false;
      }

      // Execute graph animation step (reveals edge and triggers glowing money pulse)
      const currentSpeed = speedRef.current;
      if (canvasRef.current?.animateStep) {
        await canvasRef.current.animateStep(step, currentSpeed, isNewReceiver);
      }
      
      if (isCancelled) return;

      // Extract narrative info from InvestigationDirector
      const { 
        narrationEvents, 
        isEvidenceMoment, 
        evidenceDetail
      } = getInvestigationNarrative(
        step,
        nextIndex,
        replaySteps,
        caseDetails?.patterns,
        primaryAccountId
      );

      // Append narrative logs
      setReplayLogs(prev => [...prev, ...narrationEvents]);

      // Calculate new risk and confidence
      const nextRisk = getRiskScoreForStep(nextIndex);
      const nextConfidence = getConfidenceForStep(nextIndex);
      
      setCurrentRiskScore(nextRisk);
      setConfidenceScore(nextConfidence);

      // Handle cinematic evidence moments (pause replay and zoom Node)
      if (isEvidenceMoment && evidenceDetail) {
        // Stage evidence card in sidebar
        const newEvidence = {
          id: Math.random().toString(),
          name: evidenceDetail.name,
          amount: evidenceDetail.amount,
          timestamp: formatTxTime(evidenceDetail.timestamp),
          confidence: evidenceDetail.confidence,
          severity: evidenceDetail.severity,
          affectedTransactions: evidenceDetail.affectedTransactions
        };
        setEvidenceList(prev => [...prev, newEvidence]);

        // Zoom slightly
        if (canvasRef.current?.zoomNode) {
          canvasRef.current.zoomNode(targetId);
        }

        // Display overlays
        const nodePosition = canvasRef.current?.getRenderedPosition 
          ? canvasRef.current.getRenderedPosition(targetId)
          : null;
          
        const targetNodeRisk = nodes.find(n => String(n.accountId || n.id || n.account_id) === targetId)?.risk || 50;
        const metrics = getCumulativeMetricsForStep(nextIndex, targetId);

        if (nodePosition) {
          const containerWidth = canvasRef.current?.getContainerWidth ? canvasRef.current.getContainerWidth() : 800;
          nodePosition.alignLeft = nodePosition.x > containerWidth * 0.6;
        }

        setInterrogatedNodeData({
          accountId: targetId,
          total_inflow: metrics.total_inflow,
          total_outflow: metrics.total_outflow,
          tx_count: metrics.tx_count,
          risk: targetNodeRisk,
          patternName: evidenceDetail.name,
          confidence: evidenceDetail.confidence
        });
        setInterrogatedNodePosition(nodePosition);

        setActiveEvidence(evidenceDetail);
        setEvidenceOverlayVisible(true);
        setNodeInterrogationVisible(true);

        // Await the cinematic pause (900ms / playbackSpeed)
        await new Promise(r => setTimeout(r, 900 / currentSpeed));

        if (isCancelled) return;

        setEvidenceOverlayVisible(false);
        setNodeInterrogationVisible(false);
        
        if (canvasRef.current?.resetZoom) {
          canvasRef.current.resetZoom();
        }

        // Advance state
        setCurrentIndex(nextIndex);
        
        // Wait briefly after zooming out before advancing to the next transaction
        await new Promise(r => setTimeout(r, 350));
      } else {
        // Normal step transition
        setCurrentIndex(nextIndex);
      }
    };

    const timer = setTimeout(() => {
      run();
    }, currentIndex === -1 ? 0 : (250 / speedRef.current));

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [replayActive, isPlaying, currentIndex, replaySteps]);

  // Regular action handlers
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

  // Replay manipulation
  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const handleNext = async () => {
    if (currentIndex >= replaySteps.length - 1) return;
    setIsPlaying(false);
    const nextIndex = currentIndex + 1;
    const step = replaySteps[nextIndex];
    if (!step) return;

    const targetId = String(step.target || step.to);
    let isNewReceiver = true;
    for (let i = 0; i <= currentIndex; i++) {
      const prevStep = replaySteps[i];
      if (String(prevStep.source || prevStep.from) === targetId || String(prevStep.target || prevStep.to) === targetId) {
        isNewReceiver = false;
        break;
      }
    }
    if (targetId === primaryAccountId) {
      isNewReceiver = false;
    }

    if (canvasRef.current?.animateStep) {
      await canvasRef.current.animateStep(step, playbackSpeed, isNewReceiver);
    }

    const { narrationEvents } = getInvestigationNarrative(
      step,
      nextIndex,
      replaySteps,
      caseDetails?.patterns,
      primaryAccountId
    );

    setReplayLogs(prev => [...prev, ...narrationEvents]);
    setCurrentRiskScore(getRiskScoreForStep(nextIndex));
    setConfidenceScore(getConfidenceForStep(nextIndex));
    setCurrentIndex(nextIndex);
  };

  const handlePrev = () => {
    if (currentIndex < 0) return;
    setIsPlaying(false);
    const prevIndex = currentIndex - 1;
    if (canvasRef.current?.applyReplayState) {
      canvasRef.current.applyReplayState(prevIndex, replaySteps, primaryAccountId);
    }
    
    regenerateLogsAndEvidenceUpTo(prevIndex);
    setCurrentRiskScore(getRiskScoreForStep(prevIndex));
    setConfidenceScore(getConfidenceForStep(prevIndex));
    setCurrentIndex(prevIndex);
  };

  const handleRestart = () => {
    setIsPlaying(false);
    if (canvasRef.current?.applyReplayState) {
      canvasRef.current.applyReplayState(-1, replaySteps, primaryAccountId);
    }
    setCurrentIndex(-1);
    setReplayLogs([]);
    setEvidenceList([]);
    setCurrentRiskScore(22);
    setConfidenceScore(50);
    setShowSummaryCard(false);
    setIsPlaying(true);
  };

  const handleStepSelect = (index) => {
    setIsPlaying(false);
    if (canvasRef.current?.applyReplayState) {
      canvasRef.current.applyReplayState(index, replaySteps, primaryAccountId);
    }
    regenerateLogsAndEvidenceUpTo(index);
    setCurrentRiskScore(getRiskScoreForStep(index));
    setConfidenceScore(getConfidenceForStep(index));
    setCurrentIndex(index);
  };

  const regenerateLogsAndEvidenceUpTo = (index) => {
    const logList = [];
    const evList = [];
    
    for (let i = 0; i <= index; i++) {
      const step = replaySteps[i];
      if (!step) continue;

      const { narrationEvents, isEvidenceMoment, evidenceDetail } = getInvestigationNarrative(
        step,
        i,
        replaySteps,
        caseDetails?.patterns,
        primaryAccountId
      );

      logList.push(...narrationEvents);

      if (isEvidenceMoment && evidenceDetail) {
        evList.push({
          id: `ev-${i}-${evidenceDetail.name}`,
          name: evidenceDetail.name,
          amount: evidenceDetail.amount,
          timestamp: formatTxTime(evidenceDetail.timestamp),
          confidence: evidenceDetail.confidence,
          severity: evidenceDetail.severity,
          affectedTransactions: evidenceDetail.affectedTransactions
        });
      }
    }
    setReplayLogs(logList);
    setEvidenceList(evList);
  };

  const handleExitReplay = () => {
    setIsPlaying(false);
    setReplayActive(false);
    
    if (canvasRef.current?.applyReplayState) {
      canvasRef.current.applyReplayState(replaySteps.length - 1, replaySteps, primaryAccountId);
    }
    setSelectedNode(null);
  };

  const handleStartReplay = () => {
    setReplayActive(true);
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden relative w-full">
      {/* CSS Styles injection */}
      <style>{`
        @keyframes floatUpFade {
          0% {
            transform: translate(-50%, 15px);
            opacity: 0;
          }
          15% {
            transform: translate(-50%, 0);
            opacity: 1;
          }
          85% {
            transform: translate(-50%, -5px);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -20px);
            opacity: 0;
          }
        }
        .floating-badge {
          animation: floatUpFade 2s forwards cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
      
      {/* Graph Area */}
      <div className="flex-1 relative flex flex-col h-full min-w-0">
        
        {/* Floating Legend - only visible in normal mode */}
        {!replayActive && <Legend />}

        {/* Floating Risk Score & Confidence Animator - only visible in replay mode */}
        {replayActive && (
          <div className="absolute top-5 right-5 z-40">
            <RiskAnimator targetScore={currentRiskScore} targetConfidence={confidenceScore} playbackSpeed={playbackSpeed} />
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 w-full h-full">
          <GraphCanvas 
            ref={canvasRef} 
            nodes={nodes} 
            edges={edges} 
            onNodeClick={setSelectedNode} 
            replayMode={replayActive}
            primaryAccountId={primaryAccountId}
          />
        </div>

        {/* Floating Playback Controls - only visible in replay mode */}
        {replayActive && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 w-full px-4 max-w-2xl">
            <ReplayController
              currentIndex={currentIndex}
              totalSteps={replaySteps.length}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onPrev={handlePrev}
              onRestart={handleRestart}
              onSpeedChange={setPlaybackSpeed}
              onStepSelect={handleStepSelect}
              onExitReplay={handleExitReplay}
              steps={timelineSteps}
            />
          </div>
        )}

        {/* Selected Node Details Card - only visible in normal mode */}
        {!replayActive && selectedNode && (
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

        {/* Floating Timeline Overlay Drawer - only visible in normal mode */}
        {!replayActive && showTimeline && (
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

        {/* Floating Case Closure Dashboard Report */}
        {replayActive && showSummaryCard && (
          <CaseClosurePanel
            transactionCount={replaySteps.length}
            entityCount={nodes.length}
            patternCount={caseDetails?.patterns?.length || 0}
            confidence={97}
            riskLevel={caseData?.risk_score >= 60 ? 'CRITICAL' : 'HIGH'}
            onRestart={handleRestart}
            onDismiss={handleExitReplay}
          />
        )}

        {/* Intro Overlay Loader */}
        {replayActive && showIntro && (
          <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center gap-4 animate-out fade-out duration-500">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Reconstructing Money Trail...</h3>
              <p className="text-[9px] text-slate-500 font-mono">Loading transaction timeline and money flow mapping...</p>
            </div>
          </div>
        )}

        {/* Floating Investigation Badges */}
        {floatingBadges.map((badge) => (
          <div
            key={badge.id}
            className="absolute bg-amber-500 text-slate-950 font-black text-[9px] uppercase px-2.5 py-1 rounded-full border border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] z-40 pointer-events-none floating-badge"
            style={{
              left: badge.x,
              top: badge.y,
              transform: 'translateX(-50%)'
            }}
          >
            {badge.text}
          </div>
        ))}

        {/* Cinematic Evidence Overlay Card */}
        <EvidenceOverlay 
          evidence={activeEvidence} 
          visible={replayActive && evidenceOverlayVisible} 
        />

        {/* Floating Node Interrogation Popup */}
        <NodeProfilePopup 
          nodeData={interrogatedNodeData} 
          position={interrogatedNodePosition} 
          visible={replayActive && nodeInterrogationVisible} 
        />

      </div>

      {/* Side Action Panel / Replay Panel */}
      <div className="w-80 h-full shrink-0">
        {replayActive ? (
          <ReplayActionPanel
            caseId={caseData?.case_id || 'UNKNOWN'}
            currentIndex={currentIndex}
            totalSteps={replaySteps.length}
            currentStep={currentIndex >= 0 ? replaySteps[currentIndex] : null}
            activePatterns={currentIndex >= 0 
              ? (caseDetails?.patterns || []).filter(pat => 
                  pat && pat.related_transactions && pat.related_transactions.includes(replaySteps[currentIndex].tx_id || replaySteps[currentIndex].id)
                )
              : []
            }
            evidenceList={evidenceList}
            logs={replayLogs}
            onLogClick={handleLogClick}
          />
        ) : (
          <ActionPanel
            caseId={caseData?.case_id || 'UNKNOWN'}
            selectedNode={selectedNode}
            onTraceMoneyFlow={handleTraceMoneyFlow}
            onExpandNetwork={handleExpandNetwork}
            onToggleTimeline={() => setShowTimeline(!showTimeline)}
            onHighlightSuspicious={handleHighlightSuspicious}
            onClearHighlights={handleClearHighlights}
            logs={logs}
            onLogClick={handleLogClick}
            onStartReplay={handleStartReplay}
          />
        )}
      </div>

    </div>
  );
};

export default GraphModule;
