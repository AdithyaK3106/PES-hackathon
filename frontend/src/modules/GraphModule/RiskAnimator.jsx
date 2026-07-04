import React, { useEffect, useState, useRef } from 'react';

export default function RiskAnimator({ targetScore, targetConfidence, playbackSpeed = 0.5 }) {
  const [currentScore, setCurrentScore] = useState(22);
  const [currentConfidence, setCurrentConfidence] = useState(50);
  
  const scoreRef = useRef(22);
  const confidenceRef = useRef(50);

  useEffect(() => {
    const startScore = scoreRef.current;
    const endScore = targetScore;

    const startConf = confidenceRef.current;
    const endConf = targetConfidence !== undefined ? targetConfidence : 50;

    if (startScore === endScore && startConf === endConf) return;

    const duration = 800 / playbackSpeed; // ms duration scaled with playbackSpeed
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing: easeOutQuad
      const easedProgress = progress * (2 - progress);
      
      const scoreCurrent = Math.round(startScore + (endScore - startScore) * easedProgress);
      const confCurrent = Math.round(startConf + (endConf - startConf) * easedProgress);

      setCurrentScore(scoreCurrent);
      setCurrentConfidence(confCurrent);

      scoreRef.current = scoreCurrent;
      confidenceRef.current = confCurrent;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [targetScore, targetConfidence, playbackSpeed]);

  const getRiskDetails = (score) => {
    if (score >= 75) {
      return { 
        label: 'Critical Risk', 
        colorCls: 'text-red-400 bg-red-950/45 border-red-900/60 shadow-[0_0_15px_rgba(239,68,68,0.15)]',
        indicatorCls: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
      };
    }
    if (score >= 50) {
      return { 
        label: 'High Risk', 
        colorCls: 'text-orange-400 bg-orange-950/40 border-orange-900/50 shadow-[0_0_12px_rgba(249,115,22,0.12)]',
        indicatorCls: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]'
      };
    }
    if (score >= 30) {
      return { 
        label: 'Medium Risk', 
        colorCls: 'text-amber-400 bg-amber-950/30 border-amber-900/40 shadow-[0_0_8px_rgba(245,158,11,0.08)]',
        indicatorCls: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.3)]'
      };
    }
    return { 
      label: 'Normal Status', 
      colorCls: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30',
      indicatorCls: 'bg-emerald-500'
    };
  };

  const details = getRiskDetails(currentScore);

  return (
    <div className="flex flex-col gap-2">
      {/* Risk Rating Card */}
      <div className={`flex flex-col items-end px-4 py-3 rounded-xl border backdrop-blur-md transition-all duration-700 min-w-[140px] ${details.colorCls}`}>
        <span className="text-[9px] uppercase font-black tracking-widest opacity-60">Reconstruction Risk</span>
        
        <div className="flex items-baseline gap-1 mt-0.5 font-mono">
          <span className="text-3xl font-black tracking-tight">{currentScore}</span>
          <span className="text-xs opacity-60 font-sans">%</span>
        </div>
        
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${details.indicatorCls}`} />
          <span className="text-[9px] font-black uppercase tracking-wider">{details.label}</span>
        </div>
      </div>

      {/* Confidence Card */}
      <div className="flex flex-col items-end px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-indigo-400 backdrop-blur-md min-w-[140px] shadow-[0_0_10px_rgba(99,102,241,0.05)]">
        <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 opacity-80">AI Confidence</span>
        
        <div className="flex items-baseline gap-0.5 font-mono mt-0.5 text-indigo-300">
          <span className="text-xl font-bold tracking-tight">{currentConfidence}</span>
          <span className="text-[10px] opacity-70 font-sans">%</span>
        </div>
      </div>
    </div>
  );
}
