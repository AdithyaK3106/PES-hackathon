import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Activity, ShieldAlert, BarChart3, TrendingUp, 
  UploadCloud, AlertOctagon, Layers, Search, RefreshCw
} from 'lucide-react';
import { useDataStore } from '../hooks/useDataStore';
import CaseCard from '../components/CaseCard';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, cases, loading, fetchStats, fetchInvestigations } = useDataStore();

  useEffect(() => {
    fetchStats();
    fetchInvestigations();
  }, []);

  const formatINR = (value) => {
    if (value === undefined || value === null) return '₹0';
    try {
      const num = parseInt(value);
      const s = String(num);
      if (s.length <= 3) return `₹${s}`;
      const lastThree = s.substring(s.length - 3);
      let remaining = s.substring(0, s.length - 3);
      const groups = [];
      while (remaining.length > 0) {
        groups.push(remaining.substring(Math.max(0, remaining.length - 2)));
        remaining = remaining.substring(0, Math.max(0, remaining.length - 2));
      }
      groups.reverse();
      return `₹${groups.join(',')},${lastThree}`;
    } catch {
      return `₹${Number(value).toLocaleString('en-IN')}`;
    }
  };

  // Prepare Recharts Data
  const riskData = Object.entries(stats?.risk_distribution || {}).map(([name, value]) => ({
    name,
    count: value
  }));

  const channelData = Object.entries(stats?.channel_distribution || {}).map(([name, value]) => ({
    name,
    value
  }));

  const patternData = Object.entries(stats?.pattern_distribution || {}).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    count: value
  })).sort((a, b) => b.count - a.count);

  const timelineData = stats?.timeline_activity || [];

  const RISK_COLORS = {
    'CRITICAL': '#ef4444',
    'HIGH': '#f97316',
    'MEDIUM': '#f59e0b',
    'LOW': '#10b981'
  };

  const CHANNEL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-slate-100 space-y-10">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
            Workstation Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Real-time static financial analysis & money flow forensics
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { fetchStats(); fetchInvestigations(); }}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all"
            title="Refresh Dashboard Data"
          >
            <RefreshCw size={16} />
          </button>
          <button 
            onClick={() => navigate('/upload')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-lg text-sm shadow-lg shadow-blue-900/30 transition-all flex items-center gap-2"
          >
            <UploadCloud size={16} />
            Upload Statements
          </button>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Statements Processed', value: stats?.statements_uploaded || 0, icon: FileText, color: 'text-indigo-400' },
          { label: 'Investigations Opened', value: stats?.investigations_created || 0, icon: Activity, color: 'text-blue-400' },
          { label: 'Critical / High Cases', value: stats?.high_risk_investigations || 0, icon: AlertOctagon, color: 'text-red-400' },
          { label: 'Flagged Transactions', value: stats?.high_risk_transactions || 0, icon: ShieldAlert, color: 'text-amber-400' },
          { label: 'Total Volume Scanned', value: formatINR(stats?.total_volume), icon: TrendingUp, color: 'text-emerald-400', isLarge: true }
        ].map((kpi, i) => (
          <div 
            key={i} 
            className={`bg-slate-900 border border-slate-850 p-5 rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden ${
              kpi.isLarge ? 'col-span-2 md:col-span-1' : ''
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider leading-snug">
                {kpi.label}
              </span>
              <kpi.icon size={16} className={`${kpi.color} opacity-80`} />
            </div>
            <p className="text-xl font-black text-white mt-4 tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </section>

      {/* Chart Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Timeline Chart */}
        <div className="bg-slate-900 border border-slate-850 rounded-xl p-6 shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-wider mb-6 text-slate-400 flex items-center gap-2">
            <TrendingUp size={14} className="text-indigo-400" /> Scanning Volume History
          </h3>
          <div className="h-[280px] w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '10px', color: '#f1f5f9' }}
                    labelStyle={{ fontSize: '10px', color: '#64748b' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#4f46e5" 
                    strokeWidth={3} 
                    dot={{ fill: '#4f46e5', r: 3 }} 
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-600 italic">
                No activity records available.
              </div>
            )}
          </div>
        </div>

        {/* Risk Distribution Chart */}
        <div className="bg-slate-900 border border-slate-850 rounded-xl p-6 shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-wider mb-6 text-slate-400 flex items-center gap-2">
            <BarChart3 size={14} className="text-indigo-400" /> Case Risk Profile Distribution
          </h3>
          <div className="h-[280px] w-full">
            {riskData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32}>
                    {riskData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={RISK_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-600 italic">
                No case risk metrics available.
              </div>
            )}
          </div>
        </div>

        {/* Channel Pie Chart */}
        <div className="bg-slate-900 border border-slate-850 rounded-xl p-6 shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-wider mb-6 text-slate-400 flex items-center gap-2">
            <Layers size={14} className="text-indigo-400" /> Transaction Channel Distribution
          </h3>
          <div className="h-[280px] w-full">
            {channelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[10px] text-slate-400 font-bold uppercase">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-600 italic">
                No transaction channels recorded.
              </div>
            )}
          </div>
        </div>

        {/* Pattern Prevalence Chart */}
        <div className="bg-slate-900 border border-slate-850 rounded-xl p-6 shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-wider mb-6 text-slate-400 flex items-center gap-2">
            <ShieldAlert size={14} className="text-indigo-400" /> Most Common Anomaly Triggers
          </h3>
          <div className="h-[280px] w-full">
            {patternData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patternData} layout="vertical">
                  <XAxis type="number" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={8} width={120} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-600 italic">
                No pattern triggers identified yet.
              </div>
            )}
          </div>
        </div>

      </section>

      {/* Grid of Top/Recent Investigations */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Active Case Investigations
          </h2>
          {cases.length > 0 && (
            <button 
              onClick={() => navigate('/investigations')}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              See all ({cases.length})
            </button>
          )}
        </div>
        
        {cases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cases.slice(0, 6).map((c) => (
              <CaseCard 
                key={c.case_id} 
                caseData={c} 
                onAnalyze={(cData) => navigate(`/graph/${cData.case_id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[280px] border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
            <span className="text-3xl mb-3">📂</span>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">No active cases loaded</h4>
            <p className="text-xs text-slate-600 mt-1">Upload statements to populate the forensic center.</p>
          </div>
        )}
      </section>

    </div>
  );
}
