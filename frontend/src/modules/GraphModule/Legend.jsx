import React from 'react';

const Legend = () => {
  const shapes = [
    { label: 'Account', color: '#3b82f6', shapeCls: 'rounded-full' },
    { label: 'Person', color: '#a855f7', shapeCls: 'rotate-45 scale-90 border' },
    { label: 'UPI ID', color: '#14b8a6', shapeCls: 'polygon-hexagon scale-90' },
    { label: 'Merchant', color: '#f97316', shapeCls: 'rounded-sm' },
    { label: 'Bank', color: '#6366f1', shapeCls: 'w-5 h-3 rounded-none' }
  ];

  const risks = [
    { label: 'High Risk (>=70)', color: '#ef4444' },
    { label: 'Medium Risk (40-69)', color: '#f59e0b' },
    { label: 'Low Risk (<40)', color: '#10b981' },
    { label: 'External / Unknown', color: '#64748b' }
  ];

  return (
    <div className="absolute top-5 left-5 bg-slate-950/90 border border-slate-800 p-4 rounded-xl shadow-2xl backdrop-blur-md z-40 flex flex-col gap-4 text-xs max-w-xs">
      
      {/* Node Types */}
      <div>
        <h4 className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-2.5">Entity Types</h4>
        <div className="space-y-2">
          {shapes.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div 
                className={`w-3.5 h-3.5 border border-slate-700/50 bg-slate-900 shrink-0 ${item.shapeCls}`} 
                style={{ 
                  backgroundColor: item.color,
                  clipPath: item.label === 'UPI ID' ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' : 'none'
                }}
              />
              <span className="text-slate-300 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="border-t border-slate-900 pt-3">
        <h4 className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-2.5">Risk Profile</h4>
        <div className="space-y-2">
          {risks.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div 
                className="w-3.5 h-3.5 rounded-full shrink-0" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-300 font-medium">{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-red-500 shrink-0" />
            <span className="text-slate-300 font-medium">Suspicious Match</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Legend;
