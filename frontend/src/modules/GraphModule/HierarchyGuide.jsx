import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';

export default function HierarchyGuide({ onClose }) {
  const [expanded, setExpanded] = useState({
    layout: true,
    hierarchy: false,
    controls: false,
    colors: false
  });

  const toggle = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const Section = ({ title, key, children }) => (
    <div className="border-b border-slate-900 last:border-0">
      <button
        onClick={() => toggle(key)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-900/50 transition-all"
      >
        <span className="text-[10px] text-slate-300 uppercase font-black tracking-wider">{title}</span>
        {expanded[key] ? (
          <ChevronDown size={14} className="text-slate-500" />
        ) : (
          <ChevronRight size={14} className="text-slate-500" />
        )}
      </button>
      {expanded[key] && (
        <div className="px-3 pb-3 text-[9px] text-slate-400 space-y-2">{children}</div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-900 sticky top-0 bg-slate-950 shrink-0">
          <h2 className="text-sm font-bold text-white">Hierarchical Investigation Tree Guide</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-900 rounded transition-all"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="divide-y divide-slate-900">
          <Section title="📊 Graph Layout" key="layout">
            <div className="space-y-3">
              <p className="leading-relaxed">
                The graph uses a <span className="font-bold text-blue-400">Directed Acyclic Graph (DAG)</span> layout
                that displays money flows from top to bottom, similar to Palantir or i2 Analyst Notebook.
              </p>
              <div className="bg-slate-900/30 border border-slate-800 rounded p-2 font-mono text-[8px]">
                <div className="font-bold text-blue-400 mb-1">PRIMARY ACCOUNT (Root)</div>
                <div className="ml-4">├── Level 1: Intermediaries</div>
                <div className="ml-6">│  ├── Level 2: Merchants</div>
                <div className="ml-6">│  └── Level 2: UPI IDs</div>
                <div className="ml-4">└── Level 1: Exit accounts</div>
              </div>
              <ul className="space-y-1 ml-2">
                <li>• <span className="font-bold">Vertical spacing:</span> 140px between levels</li>
                <li>• <span className="font-bold">Horizontal spacing:</span> 80px between siblings</li>
                <li>• <span className="font-bold">No overlaps:</span> All nodes and edges properly spaced</li>
                <li>• <span className="font-bold">Smooth curves:</span> Bezier edges avoid crossing</li>
              </ul>
            </div>
          </Section>

          <Section title="🎯 Node Hierarchy" key="hierarchy">
            <div className="space-y-3">
              <p className="leading-relaxed">
                Nodes are classified and positioned based on their role in the investigation:
              </p>
              <div className="space-y-2">
                <div className="bg-slate-900/30 border-l-2 border-blue-500 pl-2 py-1">
                  <span className="font-bold text-blue-400">Primary Account</span>
                  <div className="text-[8px] text-slate-500 mt-0.5">Root node at top, 120px size, blue glow</div>
                </div>
                <div className="bg-slate-900/30 border-l-2 border-purple-500 pl-2 py-1">
                  <span className="font-bold text-purple-400">Intermediaries</span>
                  <div className="text-[8px] text-slate-500 mt-0.5">Level 1: High-risk accounts, people, entities</div>
                </div>
                <div className="bg-slate-900/30 border-l-2 border-orange-500 pl-2 py-1">
                  <span className="font-bold text-orange-400">Merchants & UPI</span>
                  <div className="text-[8px] text-slate-500 mt-0.5">Level 2: Exit points, final destinations</div>
                </div>
              </div>
            </div>
          </Section>

          <Section title="🎮 Controls & Interactions" key="controls">
            <div className="space-y-2">
              <div className="bg-slate-900/30 rounded p-2">
                <div className="font-bold text-slate-300 mb-1">Click Node</div>
                <div className="text-[8px] text-slate-500">Select and inspect properties in right sidebar</div>
              </div>
              <div className="bg-slate-900/30 rounded p-2">
                <div className="font-bold text-slate-300 mb-1">Click Intermediate (Expandable)</div>
                <div className="text-[8px] text-slate-500">Toggle branch expansion/collapse</div>
              </div>
              <div className="bg-slate-900/30 rounded p-2">
                <div className="font-bold text-slate-300 mb-1">Hover Edge</div>
                <div className="text-[8px] text-slate-500">View transaction amount, channel, and timestamp</div>
              </div>
              <div className="bg-slate-900/30 rounded p-2">
                <div className="font-bold text-slate-300 mb-1">Trace Money Flow (Sidebar)</div>
                <div className="text-[8px] text-slate-500">Highlight path from selected node downstream</div>
              </div>
              <div className="bg-slate-900/30 rounded p-2">
                <div className="font-bold text-slate-300 mb-1">2-Hop Network Expand</div>
                <div className="text-[8px] text-slate-500">Reveal all neighbors up to 2 hops away</div>
              </div>
            </div>
          </Section>

          <Section title="🎨 Visual Indicators" key="colors">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-500 border border-red-700 rounded-full" />
                <div>
                  <div className="font-bold text-red-400">High Risk (≥70%)</div>
                  <div className="text-[8px] text-slate-500">Critical fraud indicator</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-amber-500 border border-amber-700 rounded-full" />
                <div>
                  <div className="font-bold text-amber-400">Medium Risk (40-69%)</div>
                  <div className="text-[8px] text-slate-500">Suspicious pattern detected</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 border border-green-700 rounded-full" />
                <div>
                  <div className="font-bold text-green-400">Low Risk (&lt;40%)</div>
                  <div className="text-[8px] text-slate-500">Normal transaction pattern</div>
                </div>
              </div>
              <div className="border-t border-slate-900 pt-2 mt-2">
                <p className="text-[8px] text-slate-500 font-bold mb-1">Edge thickness = Transaction amount</p>
                <p className="text-[8px] text-slate-500">Thicker edges = larger transfers</p>
              </div>
            </div>
          </Section>

          <Section title="💡 Tips & Best Practices" key="tips">
            <ul className="space-y-1 text-[8px]">
              <li>• <span className="font-bold">Start at Primary:</span> Always begin investigation at the root node (highlighted in blue)</li>
              <li>• <span className="font-bold">Trace Flows:</span> Use "Trace Downstream Flow" to follow money paths to exit accounts</li>
              <li>• <span className="font-bold">Collapse Branches:</span> Click intermediates to hide less-relevant branches and reduce clutter</li>
              <li>• <span className="font-bold">Zoom & Pan:</span> Use scroll to zoom, drag to pan across large graphs</li>
              <li>• <span className="font-bold">Highlight Suspicious:</span> Use global "Highlight Suspicious Elements" to mark all high-risk nodes</li>
              <li>• <span className="font-bold">Export Data:</span> Export graph as JSON for external analysis or forensic reports</li>
            </ul>
          </Section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] transition-all"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
