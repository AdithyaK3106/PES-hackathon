import React from 'react';
import { ChevronRight, Info } from 'lucide-react';

export default function HierarchyLegend() {
  return (
    <div className="absolute top-5 right-5 bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow-2xl backdrop-blur-md z-30 max-w-xs">
      <h4 className="text-[9px] text-slate-500 uppercase font-black tracking-wider border-b border-slate-900 pb-2 mb-3 flex items-center gap-1">
        <Info size={11} className="text-indigo-400" />
        Hierarchy & Controls
      </h4>

      <div className="space-y-3 text-[10px]">
        {/* Node Types */}
        <div>
          <span className="text-slate-400 font-bold block mb-1.5">Node Types</span>
          <div className="space-y-1 pl-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-blue-700 shadow-lg shadow-blue-500/50" />
              <span className="text-slate-400">Primary Account (Root)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-600 border border-purple-700" />
              <span className="text-slate-400">Person/Individual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-4 bg-teal-600 border border-teal-700 rounded-full" />
              <span className="text-slate-400">UPI ID</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-4 bg-orange-600 border border-orange-700 rounded" />
              <span className="text-slate-400">Merchant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-4 bg-indigo-600 border border-indigo-700 rounded" />
              <span className="text-slate-400">Bank</span>
            </div>
          </div>
        </div>

        {/* Risk Levels */}
        <div className="border-t border-slate-900 pt-2">
          <span className="text-slate-400 font-bold block mb-1.5">Risk Indicators</span>
          <div className="space-y-1 pl-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500 border border-red-700" />
              <span className="text-slate-400">High Risk (≥70)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500 border border-amber-700" />
              <span className="text-slate-400">Medium Risk (40-69)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500 border border-green-700" />
              <span className="text-slate-400">Low Risk (&lt;40)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-600 border border-slate-700" />
              <span className="text-slate-400">Unknown</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="border-t border-slate-900 pt-2">
          <span className="text-slate-400 font-bold block mb-1.5">Interactions</span>
          <div className="space-y-1 text-[9px] pl-2 text-slate-500">
            <div><ChevronRight size={10} className="inline mr-1" /><span className="font-medium">Click node</span> → Select & inspect</div>
            <div><ChevronRight size={10} className="inline mr-1" /><span className="font-medium">Click intermediate</span> → Expand/collapse branch</div>
            <div><ChevronRight size={10} className="inline mr-1" /><span className="font-medium">Hover edge</span> → Show transaction details</div>
            <div><ChevronRight size={10} className="inline mr-1" /><span className="font-medium">Use sidebar tools</span> → Trace, expand, highlight</div>
          </div>
        </div>

        {/* Edge Thickness */}
        <div className="border-t border-slate-900 pt-2">
          <span className="text-slate-400 font-bold block mb-1.5">Edge Thickness</span>
          <div className="space-y-1 pl-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-slate-600 rounded" />
              <span className="text-slate-400 text-[9px]">Small transfer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-2 bg-slate-500 rounded" />
              <span className="text-slate-400 text-[9px]">Medium transfer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-3 bg-slate-400 rounded" />
              <span className="text-slate-400 text-[9px]">Large transfer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
