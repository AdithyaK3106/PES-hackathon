import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, RotateCcw, SkipBack, SkipForward, X, AlertTriangle 
} from 'lucide-react';

export default function ReplayController({
  currentIndex,
  totalSteps,
  isPlaying,
  playbackSpeed,
  onPlayPause,
  onNext,
  onPrev,
  onRestart,
  onSpeedChange,
  onStepSelect,
  onExitReplay,
  steps = []
}) {
  const containerRef = useRef(null);
  const dotRefs = useRef([]);
  const [activeLineWidth, setActiveLineWidth] = useState(0);

  // Initialize dotRefs array size
  useEffect(() => {
    dotRefs.current = dotRefs.current.slice(0, steps.length);
  }, [steps]);

  // Center active dot inside scrollable timeline container and compute progress line width
  useEffect(() => {
    if (currentIndex < 0 || dotRefs.current.length === 0) {
      setActiveLineWidth(0);
      return;
    }

    const activeDot = dotRefs.current[currentIndex];
    const firstDot = dotRefs.current[0];
    const container = containerRef.current;

    if (activeDot && firstDot) {
      // Calculate line length from first dot center to active dot center
      const width = activeDot.offsetLeft - firstDot.offsetLeft;
      setActiveLineWidth(width);
    }

    if (activeDot && container) {
      const activeOffsetLeft = activeDot.offsetLeft;
      const activeWidth = activeDot.clientWidth;
      const containerWidth = container.clientWidth;

      // Scroll smoothly to center the active dot
      container.scrollTo({
        left: activeOffsetLeft + activeWidth / 2 - containerWidth / 2,
        behavior: 'smooth'
      });
    }
  }, [currentIndex, steps]);

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-950/90 border border-slate-800/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col gap-3 select-none relative overflow-hidden">
      
      {/* Hide Scrollbars CSS */}
      <style>{`
        .timeline-scroll-container::-webkit-scrollbar {
          display: none;
        }
        .timeline-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Timeline container with left/right fade gradients */}
      <div className="relative flex items-center w-full px-2">
        {/* Left Fade Gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent z-15 pointer-events-none" />
        
        {/* Scrollable Timeline viewport */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-x-auto py-2 timeline-scroll-container scroll-smooth"
        >
          {/* Timeline track content */}
          <div className="flex items-center gap-6 relative px-10 min-w-max h-8">
            
            {/* Background Line (connects all dots) */}
            <div 
              className="absolute h-0.5 bg-slate-800 rounded-full"
              style={{
                left: '40px', // Matches center of first dot
                right: '40px', // Matches center of last dot
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 0
              }}
            />
            
            {/* Active Progress Line */}
            <div 
              className="absolute h-0.5 bg-indigo-500 rounded-full transition-all duration-300"
              style={{
                left: '40px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: `${activeLineWidth}px`,
                zIndex: 1
              }}
            />

            {/* Dots representing steps */}
            {steps.map((step, idx) => {
              const isCompleted = idx <= currentIndex;
              const isActive = idx === currentIndex;
              const hasPattern = step.hasPattern;
              
              let dotColorCls = 'bg-slate-900 border-slate-700 hover:border-slate-500';
              if (isCompleted) {
                dotColorCls = hasPattern
                  ? 'bg-amber-500 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                  : 'bg-indigo-500 border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.6)]';
              }
              
              // Smart Tooltip Alignment to prevent horizontal clipping
              let tooltipAlignCls = 'left-1/2 -translate-x-1/2';
              if (idx === 0) tooltipAlignCls = 'left-0';
              if (idx === steps.length - 1) tooltipAlignCls = 'right-0';
              
              return (
                <div
                  key={idx}
                  ref={el => dotRefs.current[idx] = el}
                  onClick={() => onStepSelect(idx)}
                  className="group relative flex items-center justify-center cursor-pointer h-6 w-6 z-10"
                >
                  {/* Outer glowing ring for active item */}
                  {isActive && (
                    <span className={`absolute w-6 h-6 rounded-full animate-ping opacity-30 ${
                      hasPattern ? 'bg-amber-500' : 'bg-indigo-500'
                    }`} />
                  )}
                  
                  {/* Core dot */}
                  <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-350 ${
                    isActive ? 'scale-125 z-20 border-white bg-indigo-400 shadow-[0_0_12px_rgba(255,255,255,0.8)]' : ''
                  } ${dotColorCls}`} />

                  {/* Tooltip */}
                  <div className={`pointer-events-none absolute bottom-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 border border-slate-800 text-slate-200 rounded px-2.5 py-1 text-[9px] font-mono whitespace-nowrap z-50 shadow-xl flex items-center gap-1.5 ${tooltipAlignCls}`}>
                    {hasPattern && <AlertTriangle size={10} className="text-amber-500" />}
                    <span>Step {idx + 1}: ₹{new Intl.NumberFormat('en-IN').format(step.amount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Fade Gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-950 via-slate-950/70 to-transparent z-15 pointer-events-none" />
      </div>

      {/* Playback Controls Row */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-t border-slate-900/60 pt-3 z-10">
        {/* Left Side: Step Counter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-900 border border-slate-850 px-2 py-0.5 rounded">
            Tx {Math.max(1, currentIndex + 1)} / {totalSteps}
          </span>
        </div>

        {/* Center: Playback Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRestart}
            title="Restart Replay"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-250 transition-all active:scale-95"
          >
            <RotateCcw size={13} />
          </button>

          <button
            onClick={onPrev}
            disabled={currentIndex <= 0}
            title="Previous Step"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-250 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
          >
            <SkipBack size={13} />
          </button>

          <button
            onClick={onPlayPause}
            className={`p-2.5 rounded-full text-white transition-all transform active:scale-90 shadow-lg ${
              isPlaying 
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/20' 
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/20'
            }`}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>

          <button
            onClick={onNext}
            disabled={currentIndex >= totalSteps - 1}
            title="Next Step"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-250 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
          >
            <SkipForward size={13} />
          </button>
        </div>

        {/* Right Side: Speed Selector & Close */}
        <div className="flex items-center gap-3">
          {/* Speed Selectors */}
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-850">
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  playbackSpeed === speed
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={onExitReplay}
            title="Exit Replay"
            className="flex items-center gap-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded-lg text-[10px] transition-all"
          >
            <X size={12} />
            <span className="hidden sm:inline">Interactive Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
}
