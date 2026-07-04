import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GraphCanvas from './GraphCanvas';
import Legend from './Legend';
import HierarchyLegend from './HierarchyLegend';
import TreeNodeInspector from './TreeNodeInspector';
import HierarchyGuide from './HierarchyGuide';
import {
  Calendar, X, Compass, ZoomIn, ShieldAlert, XCircle,
  FileText, ArrowLeft, ArrowRight, Download, Filter,
  ChevronDown, Search, Activity, HelpCircle, User,
  AlertTriangle, CheckCircle, HelpCircle as HelpIcon,
  Layers, Database, Landmark, Percent
} from 'lucide-react';
import { getRole } from '../../roleStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Helper to format values in Indian currency (INR)
const formatINR = (val) => {
  const num = Number(val || 0);
  return '₹' + new Intl.NumberFormat('en-IN').format(num);
};

const formatShortINR = (val) => {
  const num = Number(val || 0);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return '₹' + new Intl.NumberFormat('en-IN').format(num);
};

export default function GraphModule({ caseDetails }) {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState(null);
  const [layoutMode, setLayoutMode] = useState('Hierarchical');
  const [showFilters, setShowFilters] = useState(false);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [logs, setLogs] = useState([]);
  const [showGuide, setShowGuide] = useState(false);
  const canvasRef = useRef(null);
  const role = getRole();

  if (!caseDetails) return null;

  const { case: caseData, graph, timeline = [] } = caseDetails;

  const nodes = useMemo(() => Array.isArray(graph?.nodes) ? graph.nodes : [], [graph?.nodes]);
  const edges = useMemo(() => Array.isArray(graph?.edges) ? graph.edges : [], [graph?.edges]);

  // Primary Account detection
  const primaryNodeId = useMemo(() => {
    const primary = nodes.find(n => n.node_type === 'account' && n.label?.includes('(Owner)'))
                  || nodes.find(n => n.nodeType === 'account' && n.label?.includes('(Owner)'))
                  || nodes.find(n => n.account_id && n.label?.includes('(Owner)'))
                  || nodes[0];
    return primary ? String(primary.accountId || primary.id || primary.account_id) : '';
  }, [nodes]);

  // Filtered nodes based on risk filter dropdown
  const filteredNodes = useMemo(() => {
    if (riskFilter === 'ALL') return nodes;
    return nodes.filter(n => {
      const r = Number(n.risk || 0);
      if (riskFilter === 'HIGH') return r >= 70;
      if (riskFilter === 'MEDIUM') return r >= 40 && r < 70;
      if (riskFilter === 'LOW') return r < 40;
      return true;
    });
  }, [nodes, riskFilter]);

  // Add Log helper
  const addLog = (action, target, description) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setLogs((prev) => [
      { time, action, target, description },
      ...prev
    ]);
  };

  // Click-to-action handlers
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

  // Format date range nicely
  const dateRangeString = useMemo(() => {
    const fromStr = caseData.statement_period?.from;
    const toStr = caseData.statement_period?.to;
    if (!fromStr || !toStr) return 'N/A';
    
    const fDate = new Date(fromStr);
    const tDate = new Date(toStr);
    
    const options = { day: '2-digit', month: 'short' };
    const optionsYear = { day: '2-digit', month: 'short', year: '2-digit' };
    
    return `${fDate.toLocaleDateString('en-IN', options)} - ${tDate.toLocaleDateString('en-IN', optionsYear)}`;
  }, [caseData]);

  // Total Volume formatted (credits + debits)
  const totalVolumeString = useMemo(() => {
    const credits = Number(caseData.total_credits || 0);
    const debits = Number(caseData.total_debits || 0);
    return formatShortINR(credits + debits);
  }, [caseData]);

  // Risk Donut chart data
  const riskDonutData = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    nodes.forEach(n => {
      const id = String(n.accountId || n.id || n.account_id);
      if (id === primaryNodeId) return; // Skip primary/root in distribution
      const r = Number(n.risk || 0);
      if (r >= 70) high++;
      else if (r >= 40) medium++;
      else low++;
    });
    return [
      { name: 'High Risk', value: high, color: '#ef4444' },
      { name: 'Medium Risk', value: medium, color: '#f59e0b' },
      { name: 'Low Risk', value: low, color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [nodes, primaryNodeId]);

  // Dynamic selected node details extraction
  const selectedNodeDetails = useMemo(() => {
    if (!selectedNode) return null;
    const nodeId = String(selectedNode.accountId || selectedNode.id || selectedNode.account_id);
    
    // Find matching node from dataset to get fresh aggregates
    const matchedNode = nodes.find(n => String(n.accountId || n.id || n.account_id) === nodeId) || selectedNode;

    // Filter transactions linked to this node
    const linkedTxs = caseDetails.transactions?.filter(tx => 
      String(tx.sender_account) === nodeId || 
      String(tx.receiver_account) === nodeId ||
      String(tx.description).toUpperCase().includes(nodeId.toUpperCase())
    ) || [];

    // Date range
    let firstSeen = 'N/A';
    let lastSeen = 'N/A';
    if (linkedTxs.length > 0) {
      const sorted = [...linkedTxs].sort((a, b) => new Date(a.date || a.timestamp) - new Date(b.date || b.timestamp));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      
      const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      };
      
      firstSeen = formatDate(first.date || first.timestamp);
      lastSeen = formatDate(last.date || last.timestamp);
    }

    // Find IFSC code
    let ifsc = 'N/A';
    const ifscRegex = /[A-Z]{4}0[A-Z0-9]{6}/;
    for (const tx of linkedTxs) {
      const match = String(tx.description).match(ifscRegex);
      if (match) {
        ifsc = match[0];
        break;
      }
    }

    // Identify Bank
    let bank = 'N/A';
    if (ifsc !== 'N/A') {
      const bankCode = ifsc.substring(0, 4);
      const bankNames = {
        'UTIB': 'Axis Bank',
        'HDFC': 'HDFC Bank',
        'ICIC': 'ICICI Bank',
        'SBIN': 'SBI Bank',
        'KKBK': 'Kotak Bank',
        'BARB': 'Bank of Baroda',
        'PUNB': 'Punjab National'
      };
      bank = bankNames[bankCode] || `${bankCode} Bank`;
    } else {
      const desc = linkedTxs.map(t => String(t.description).toUpperCase()).join(' ');
      if (desc.includes('AXIS')) bank = 'Axis Bank';
      else if (desc.includes('HDFC')) bank = 'HDFC Bank';
      else if (desc.includes('ICICI')) bank = 'ICICI Bank';
      else if (desc.includes('SBI')) bank = 'SBI Bank';
      else if (desc.includes('KOTAK')) bank = 'Kotak Bank';
      else if (desc.includes('PNB')) bank = 'PNB Bank';
      else if (desc.includes('UNION')) bank = 'Union Bank';
    }

    // Risk Factors
    const riskFactors = [];
    const r = Number(matchedNode.risk || 0);
    const inflow = Number(matchedNode.total_inflow || 0);
    const outflow = Number(matchedNode.total_outflow || 0);
    
    if (nodeId === primaryNodeId) {
      riskFactors.push({ name: 'Origin / Subject Account', severity: 'High' });
      if (r >= 70) riskFactors.push({ name: 'Critical Case Risk Rating', severity: 'High' });
    } else {
      if (r >= 70) {
        riskFactors.push({ name: 'High Risk Beneficiary', severity: 'High' });
      }
      if (inflow > 100000) {
        riskFactors.push({ name: 'Rapid Volume Inflow', severity: 'High' });
      }
      if (linkedTxs.some(tx => String(tx.description).toUpperCase().includes('RUMMY') || String(tx.description).toUpperCase().includes('PLAY'))) {
        riskFactors.push({ name: 'Gaming / Betting Outflow', severity: 'High' });
      }
      if (outflow > 50000) {
        riskFactors.push({ name: 'Significant Outward Transfer', severity: 'Medium' });
      }
      if (linkedTxs.length > 5) {
        riskFactors.push({ name: 'High Transaction Frequency', severity: 'Medium' });
      }
    }

    if (riskFactors.length === 0) {
      riskFactors.push({ name: 'Standard Transaction Pattern', severity: 'Low' });
    }

    // Connections
    const fromList = [];
    const toList = [];
    edges.forEach(e => {
      const src = String(e.source || e.from);
      const tgt = String(e.target || e.to);
      if (src === nodeId) {
        toList.push({ id: tgt, amount: e.amount });
      }
      if (tgt === nodeId) {
        fromList.push({ id: src, amount: e.amount });
      }
    });

    return {
      nodeId,
      label: matchedNode.label || nodeId,
      nodeType: matchedNode.nodeType || matchedNode.node_type || 'account',
      risk: r,
      totalInflow: matchedNode.total_inflow || 0,
      totalOutflow: matchedNode.total_outflow || 0,
      txCount: matchedNode.tx_count || linkedTxs.length,
      bank,
      ifsc,
      firstSeen,
      lastSeen,
      riskFactors,
      connections: { from: fromList, to: toList }
    };
  }, [selectedNode, nodes, edges, caseDetails.transactions, primaryNodeId]);

  // Timeline grouping by Date for Recharts
  const timelineChartData = useMemo(() => {
    const grouped = {};
    caseDetails.transactions?.forEach(t => {
      // Date formatting YYYY-MM-DD
      const dateVal = t.timestamp ? t.timestamp.substring(0, 10) : 'N/A';
      if (dateVal === 'N/A') return;
      
      const d = new Date(dateVal);
      const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      
      if (!grouped[dateVal]) {
        grouped[dateVal] = { dateVal, label, credit: 0, debit: 0 };
      }
      
      const amt = Number(t.amount || 0);
      if (t.is_debit) {
        grouped[dateVal].debit += amt;
      } else {
        grouped[dateVal].credit += amt;
      }
    });
    
    // Sort and slice last 12 active dates
    return Object.values(grouped)
      .sort((a, b) => new Date(a.dateVal) - new Date(b.dateVal))
      .slice(-12);
  }, [caseDetails.transactions]);

  // Recent Transactions (top 5 sorted by date/time descending)
  const recentTransactions = useMemo(() => {
    if (!caseDetails.transactions) return [];
    return [...caseDetails.transactions]
      .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
      .slice(0, 5);
  }, [caseDetails.transactions]);

  // Handle Export Click
  const handleExport = () => {
    alert("Exporting Money Flow Graph structure as JSON (INV-Forensic-Audit.json)...");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(caseDetails.graph, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Forensic_Graph_${caseData.case_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/investigations')} 
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 transition-all"
            title="Back to Investigations"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-mono font-bold text-white tracking-tight">{caseData.case_id}</h1>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase border ${
                caseData.risk_level === 'CRITICAL' ? 'bg-red-950/30 text-red-400 border-red-900/50' : 
                caseData.risk_level === 'HIGH' ? 'bg-amber-950/30 text-amber-400 border-amber-900/50' :
                'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                {caseData.risk_level} RISK
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Money Flow Investigation Dashboard</p>
          </div>
        </div>

        {/* KPIs bar */}
        <div className="hidden lg:flex items-center gap-6 text-[11px] border-l border-r border-slate-900 px-6 py-1">
          <div>
            <span className="text-slate-500 block uppercase text-[8px] font-black tracking-wider">Total Transactions</span>
            <span className="font-bold text-slate-200 mt-0.5 block">{caseData.total_transactions}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-900" />
          <div>
            <span className="text-slate-500 block uppercase text-[8px] font-black tracking-wider">Total Volume</span>
            <span className="font-bold text-slate-200 mt-0.5 block">{totalVolumeString}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-900" />
          <div>
            <span className="text-slate-500 block uppercase text-[8px] font-black tracking-wider">Unique Counterparties</span>
            <span className="font-bold text-slate-200 mt-0.5 block">{nodes.length - 1}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-900" />
          <div>
            <span className="text-slate-500 block uppercase text-[8px] font-black tracking-wider">Period</span>
            <span className="font-bold text-slate-200 mt-0.5 block font-mono">{dateRangeString}</span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <span className="text-[10px] text-slate-500 px-2 font-semibold">Layout:</span>
            <div className="relative">
              <select 
                value={layoutMode} 
                onChange={(e) => {
                  setLayoutMode(e.target.value);
                  // Layout mode toggles can be handled inside canvas via custom props if needed, 
                  // but tree layout is standard. We default to Hierarchical.
                }}
                className="bg-slate-950 text-[10px] font-bold text-white rounded border border-slate-850 px-2 py-0.5 pr-6 cursor-pointer focus:outline-none appearance-none font-mono"
              >
                <option value="Hierarchical">Hierarchical</option>
                <option value="Force-Directed">Grid</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`flex items-center gap-1 bg-slate-900 hover:bg-slate-850 border rounded-lg py-1 px-2.5 text-[10px] font-bold transition-all ${
                riskFilter !== 'ALL' ? 'border-indigo-500 text-indigo-400' : 'border-slate-800 text-slate-300'
              }`}
            >
              <Filter size={12} />
              Filter {riskFilter !== 'ALL' && `(${riskFilter})`}
            </button>
            
            {showFilters && (
              <div className="absolute right-0 mt-1.5 w-36 bg-slate-950 border border-slate-800 rounded-xl p-2 shadow-2xl z-50 animate-in fade-in-50 slide-in-from-top-1">
                <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider block p-1 border-b border-slate-900 mb-1">Risk Rating</span>
                {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      setRiskFilter(lvl);
                      setShowFilters(false);
                      addLog('FILTER', 'RISK', `Applied filter level: ${lvl}`);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-[10px] font-medium transition-all ${
                      riskFilter === lvl ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {lvl} Risk
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold py-1 px-2.5 rounded-lg text-[10px] border border-slate-800 transition-all"
            title="Learn about hierarchical tree layout"
          >
            <HelpCircle size={12} />
            Guide
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-2.5 rounded-lg text-[10px] shadow-sm shadow-indigo-950/20 transition-all"
          >
            <Download size={12} />
            Export Graph
          </button>
        </div>
      </header>

      {/* Hierarchy Guide Modal */}
      {showGuide && <HierarchyGuide onClose={() => setShowGuide(false)} />}

      {/* Main Content Workspace Area */}
      <div className="flex flex-1 w-full min-h-0 overflow-hidden relative">
        
        {/* Left Side Section: Graph and Bottom Panels */}
        <div className="flex-1 flex flex-col h-full min-w-0 border-r border-slate-900">
          
          {/* Graph Canvas Wrapper */}
          <div className="flex-1 w-full min-h-0 relative bg-slate-950">

            {/* Legend Component */}
            <Legend />

            {/* Hierarchy Legend */}
            <HierarchyLegend />

            {/* Floating Risk Donut chart overlay */}
            <div className="absolute bottom-5 left-5 bg-slate-950/90 border border-slate-800 rounded-xl p-3 shadow-2xl backdrop-blur-md z-30 max-w-[170px] flex flex-col gap-2">
              <h4 className="text-[8px] text-slate-500 uppercase font-black tracking-wider border-b border-slate-900 pb-1">Risk Distribution</h4>
              <div className="flex items-center gap-2">
                {riskDonutData.length > 0 ? (
                  <div className="w-[60px] h-[60px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskDonutData}
                          innerRadius={15}
                          outerRadius={26}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {riskDonutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-slate-900 border border-slate-850 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle size={14} className="text-emerald-500" />
                  </div>
                )}
                
                <div className="text-[9px] space-y-1">
                  {riskDonutData.map(item => (
                    <div key={item.name} className="flex items-center gap-1.5 font-bold">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-400 font-medium">{item.value}</span>
                    </div>
                  ))}
                  {riskDonutData.length === 0 && (
                    <span className="text-emerald-400 font-bold block">All Green</span>
                  )}
                </div>
              </div>
            </div>

            {/* Topology Overview Stats Overlay */}
            <div className="absolute bottom-5 left-[190px] bg-slate-950/90 border border-slate-800 rounded-xl p-3 shadow-2xl backdrop-blur-md z-30 min-w-[130px] flex flex-col gap-1 text-[9px]">
              <h4 className="text-[8px] text-slate-500 uppercase font-black tracking-wider border-b border-slate-900 pb-1 flex items-center gap-1">
                <Activity size={10} className="text-indigo-400 animate-pulse" /> Topology Overview
              </h4>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 font-mono">
                <div>
                  <span className="text-slate-500 block text-[7px] uppercase font-black">Nodes</span>
                  <span className="font-bold text-slate-200">{nodes.length}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[7px] uppercase font-black">Edges</span>
                  <span className="font-bold text-slate-200">{edges.length}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[7px] uppercase font-black">Max Depth</span>
                  <span className="font-bold text-slate-200">3</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[7px] uppercase font-black">Velocity</span>
                  <span className="font-bold text-slate-200">100%</span>
                </div>
              </div>
            </div>

            {/* Cytoscape Canvas */}
            <GraphCanvas 
              ref={canvasRef} 
              nodes={filteredNodes} 
              edges={edges} 
              onNodeClick={setSelectedNode} 
            />
          </div>

          {/* Bottom Panels (Timeline & Recent Tx) */}
          <div className="h-[210px] shrink-0 border-t border-slate-900 bg-slate-950/90 flex relative shrink-0">
            
            {/* Timeline activity chart */}
            <div className="flex-1 border-r border-slate-900 p-4 flex flex-col min-w-0">
              <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider mb-2 flex items-center gap-1.5 shrink-0">
                <Layers size={11} className="text-indigo-400" /> Transaction Volume Timeline
              </span>
              <div className="flex-1 w-full min-h-0">
                {timelineChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timelineChartData}
                      margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                    >
                      <XAxis 
                        dataKey="label" 
                        stroke="#475569" 
                        fontSize={8} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={8} 
                        tickFormatter={(v) => formatShortINR(v)}
                        tickLine={false} 
                        axisLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 'bold' }}
                        itemStyle={{ fontSize: '9px' }}
                        formatter={(val) => [formatINR(val), 'Volume']}
                      />
                      <Bar dataKey="credit" name="Credit (Inflow)" fill="#10b981" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="debit" name="Debit (Outflow)" fill="#ef4444" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-650 italic text-[10px]">
                    No timeline volume data available
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transaction Audit Ledger */}
            <div className="w-[45%] p-4 flex flex-col shrink-0 min-w-0">
              <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider mb-2 flex items-center gap-1.5 shrink-0">
                <Database size={11} className="text-indigo-400" /> Recent Transactions Audit Ledger
              </span>
              
              <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1">
                {recentTransactions.map((tx) => (
                  <div 
                    key={tx.tx_id} 
                    className="flex justify-between items-center bg-slate-900/40 hover:bg-slate-900/80 border border-slate-900 rounded-lg p-2 transition-all cursor-pointer"
                    onClick={() => {
                      // Click on row selects the counterparty node in graph
                      const targetId = tx.is_debit ? String(tx.receiver_account) : String(tx.sender_account);
                      const matchingNode = nodes.find(n => {
                        const id = String(n.accountId || n.id || n.account_id);
                        return id.toUpperCase() === targetId.toUpperCase();
                      });
                      if (matchingNode) {
                        setSelectedNode(matchingNode);
                        canvasRef.current?.highlightNode(targetId);
                        addLog('LEDGER_TAP', targetId, `Selected matching node from recent ledger trace.`);
                      }
                    }}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tx.is_debit ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        <p className="text-[10px] font-bold text-slate-200 truncate font-mono">
                          {tx.is_debit ? tx.receiver_account : tx.sender_account}
                        </p>
                      </div>
                      <p className="text-[8px] text-slate-500 truncate mt-0.5" title={tx.description}>
                        {tx.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-black ${tx.is_debit ? 'text-red-400' : 'text-emerald-400'}`}>
                        {tx.is_debit ? '-' : '+'}{formatShortINR(tx.amount)}
                      </span>
                      <span className="text-[7px] text-slate-500 block font-mono uppercase mt-0.5">{tx.channel}</span>
                    </div>
                  </div>
                ))}
                {recentTransactions.length === 0 && (
                  <div className="h-full flex items-center justify-center text-slate-650 italic text-[10px]">
                    No recent transaction ledger events
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Side Section: Node details sidebar */}
        <aside className="w-80 h-full bg-slate-950 border-l border-slate-900 flex flex-col p-5 overflow-y-auto shrink-0 select-none text-[11px] relative">
          {selectedNode ? (
            <TreeNodeInspector
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onTraceFlow={handleTraceMoneyFlow}
              onExpandNetwork={handleExpandNetwork}
            />
          ) : selectedNodeDetails ? (
            <div className="space-y-5 animate-in slide-in-from-right-3 duration-200">
              
              {/* Sidebar Header */}
              <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                <div className="min-w-0">
                  <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider block">Target Selection</span>
                  <h3 className="text-xs font-mono font-bold text-white truncate max-w-[190px] mt-0.5" title={selectedNodeDetails.label}>
                    {selectedNodeDetails.label}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded font-mono font-medium text-slate-400 uppercase">
                      {selectedNodeDetails.nodeType}
                    </span>
                    {selectedNodeDetails.nodeId === primaryNodeId && (
                      <span className="text-[8px] bg-indigo-950/30 text-indigo-400 border border-indigo-900/50 px-1.5 py-0.5 rounded font-black tracking-wide uppercase">
                        Origin
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)} 
                  className="text-slate-500 hover:text-slate-350 p-1 hover:bg-slate-900 rounded transition-all"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Node Risk Profiler widget */}
              <div className="bg-slate-900/40 border border-slate-900 p-3.5 rounded-xl flex items-center gap-4">
                <div className="relative flex items-center justify-center">
                  {/* Circular risk display */}
                  <svg className="w-14 h-14 rotate-[-90deg]">
                    <circle 
                      cx="28" 
                      cy="28" 
                      r="24" 
                      stroke="#1e293b" 
                      strokeWidth="3.5" 
                      fill="transparent" 
                    />
                    <circle 
                      cx="28" 
                      cy="28" 
                      r="24" 
                      stroke={selectedNodeDetails.risk >= 70 ? '#ef4444' : selectedNodeDetails.risk >= 40 ? '#f59e0b' : '#10b981'} 
                      strokeWidth="3.5" 
                      fill="transparent" 
                      strokeDasharray="150"
                      strokeDashoffset={150 - (150 * selectedNodeDetails.risk) / 100}
                    />
                  </svg>
                  <span className="absolute text-[10px] font-black text-slate-100 font-mono">
                    {selectedNodeDetails.risk}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[8px] uppercase font-black block">Risk Rating</span>
                  <span className={`text-xs font-black tracking-wide uppercase ${
                    selectedNodeDetails.risk >= 70 ? 'text-red-400' : selectedNodeDetails.risk >= 40 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {selectedNodeDetails.risk >= 70 ? 'HIGH RISK' : selectedNodeDetails.risk >= 40 ? 'MEDIUM RISK' : 'LOW RISK'}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Analytic Assessment score</span>
                </div>
              </div>

              {/* Node Details List */}
              <div className="space-y-2.5">
                <h4 className="text-[9px] text-slate-500 uppercase font-black tracking-wider pl-1">Node Properties</h4>
                <div className="bg-slate-900/20 border border-slate-900 rounded-xl overflow-hidden">
                  
                  <div className="grid grid-cols-2 border-b border-slate-900/50 p-2.5">
                    <span className="text-slate-500 font-medium font-mono text-[9px] uppercase">Account ID</span>
                    <span className="font-mono font-bold text-slate-300 break-all select-all">{selectedNodeDetails.nodeId}</span>
                  </div>

                  <div className="grid grid-cols-2 border-b border-slate-900/50 p-2.5">
                    <span className="text-slate-500 font-medium font-mono text-[9px] uppercase">Associated Bank</span>
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <Landmark size={11} className="text-indigo-400 shrink-0" />
                      {selectedNodeDetails.bank}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 border-b border-slate-900/50 p-2.5">
                    <span className="text-slate-500 font-medium font-mono text-[9px] uppercase">IFSC Code</span>
                    <span className="font-mono font-bold text-slate-350 select-all">{selectedNodeDetails.ifsc}</span>
                  </div>

                  <div className="grid grid-cols-2 border-b border-slate-900/50 p-2.5">
                    <span className="text-slate-500 font-medium font-mono text-[9px] uppercase">Received Volume</span>
                    <span className="font-bold text-emerald-400">{formatINR(selectedNodeDetails.totalInflow)}</span>
                  </div>

                  <div className="grid grid-cols-2 border-b border-slate-900/50 p-2.5">
                    <span className="text-slate-500 font-medium font-mono text-[9px] uppercase">Sent Volume</span>
                    <span className="font-bold text-red-400">{formatINR(selectedNodeDetails.totalOutflow)}</span>
                  </div>

                  <div className="grid grid-cols-2 border-b border-slate-900/50 p-2.5">
                    <span className="text-slate-500 font-medium font-mono text-[9px] uppercase">Total Transactions</span>
                    <span className="font-bold text-slate-300">{selectedNodeDetails.txCount}</span>
                  </div>

                  <div className="grid grid-cols-2 border-b border-slate-900/50 p-2.5">
                    <span className="text-slate-500 font-medium font-mono text-[9px] uppercase">First Ledger Event</span>
                    <span className="font-medium text-slate-300 font-mono">{selectedNodeDetails.firstSeen}</span>
                  </div>

                  <div className="grid grid-cols-2 p-2.5">
                    <span className="text-slate-500 font-medium font-mono text-[9px] uppercase">Last Ledger Event</span>
                    <span className="font-medium text-slate-300 font-mono">{selectedNodeDetails.lastSeen}</span>
                  </div>

                </div>
              </div>

              {/* Risk Factors Widget */}
              <div className="space-y-2.5">
                <h4 className="text-[9px] text-slate-500 uppercase font-black tracking-wider pl-1">Triggered Risk Factors</h4>
                <div className="space-y-1.5">
                  {selectedNodeDetails.riskFactors.map((factor, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-900/30 border border-slate-900 rounded-lg p-2 hover:bg-slate-900/60 transition-all">
                      <span className="text-slate-300 font-medium">{factor.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        factor.severity === 'High' ? 'bg-red-950/40 text-red-400 border border-red-900/30' :
                        factor.severity === 'Medium' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' :
                        'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                      }`}>
                        {factor.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connected To topology widget */}
              <div className="space-y-2.5">
                <h4 className="text-[9px] text-slate-500 uppercase font-black tracking-wider pl-1">Topology Connections</h4>
                <div className="bg-slate-900/10 border border-slate-900 rounded-xl p-3.5 space-y-3.5">
                  
                  {/* Incoming flows */}
                  <div>
                    <span className="text-slate-500 block text-[8px] uppercase font-black tracking-wider mb-1.5">Received Funds From ({selectedNodeDetails.connections.from.length})</span>
                    <div className="space-y-1">
                      {selectedNodeDetails.connections.from.map((conn, idx) => (
                        <div 
                          key={idx} 
                          className="flex justify-between items-center bg-slate-950 border border-slate-900/60 p-1.5 rounded cursor-pointer hover:border-slate-800 transition-all font-mono"
                          onClick={() => {
                            const nodeObj = nodes.find(n => String(n.accountId || n.id || n.account_id) === conn.id);
                            if (nodeObj) {
                              setSelectedNode(nodeObj);
                              canvasRef.current?.highlightNode(conn.id);
                              addLog('INCOMING_TAP', conn.id, `Selected incoming connected node from profile.`);
                            }
                          }}
                        >
                          <span className="text-slate-400 truncate max-w-[130px] font-bold" title={conn.id}>{conn.id}</span>
                          <span className="text-emerald-400 font-bold text-[10px] shrink-0">{formatShortINR(conn.amount)}</span>
                        </div>
                      ))}
                      {selectedNodeDetails.connections.from.length === 0 && (
                        <p className="text-slate-650 italic text-[10px] pl-1">No incoming connected elements</p>
                      )}
                    </div>
                  </div>

                  {/* Outgoing flows */}
                  <div>
                    <span className="text-slate-500 block text-[8px] uppercase font-black tracking-wider mb-1.5">Sent Funds To ({selectedNodeDetails.connections.to.length})</span>
                    <div className="space-y-1">
                      {selectedNodeDetails.connections.to.map((conn, idx) => (
                        <div 
                          key={idx} 
                          className="flex justify-between items-center bg-slate-950 border border-slate-900/60 p-1.5 rounded cursor-pointer hover:border-slate-800 transition-all font-mono"
                          onClick={() => {
                            const nodeObj = nodes.find(n => String(n.accountId || n.id || n.account_id) === conn.id);
                            if (nodeObj) {
                              setSelectedNode(nodeObj);
                              canvasRef.current?.highlightNode(conn.id);
                              addLog('OUTGOING_TAP', conn.id, `Selected outgoing connected node from profile.`);
                            }
                          }}
                        >
                          <span className="text-slate-400 truncate max-w-[130px] font-bold" title={conn.id}>{conn.id}</span>
                          <span className="text-red-400 font-bold text-[10px] shrink-0">{formatShortINR(conn.amount)}</span>
                        </div>
                      ))}
                      {selectedNodeDetails.connections.to.length === 0 && (
                        <p className="text-slate-650 italic text-[10px] pl-1">No outgoing connected elements</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Action Tools bottom area */}
              <div className="pt-2 border-t border-slate-900 space-y-2">
                <button
                  onClick={handleTraceMoneyFlow}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg shadow transition-all"
                >
                  <Compass size={14} />
                  Trace Flow Downstream
                </button>
                <button
                  onClick={handleExpandNetwork}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 font-bold py-2 px-4 rounded-lg transition-all"
                >
                  <ZoomIn size={14} />
                  2-Hop Expand Network
                </button>
              </div>

            </div>
          ) : (
            // Sidebar Empty State
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 relative">
              <Landmark size={32} className="text-slate-700 mb-3 animate-pulse" />
              <h3 className="font-bold text-slate-400 text-xs">No Target Selected</h3>
              <p className="text-[10px] text-slate-500 mt-2 max-w-[180px] leading-relaxed">
                Click on any account, merchant, person, or UPI node in the money flow tree to inspect forensic properties.
              </p>
              
              {/* Show global tools here when no node is selected */}
              <div className="w-full border-t border-slate-900 mt-8 pt-6 space-y-2 text-left">
                <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider mb-2.5 block pl-1">Global Audit Tools</span>
                <button 
                  onClick={handleHighlightSuspicious}
                  className="w-full flex items-center justify-center gap-2 bg-red-950/25 hover:bg-red-950/40 border border-red-900/30 text-red-400 font-bold py-2 px-4 rounded-lg transition-all"
                >
                  <ShieldAlert size={14} />
                  Highlight Suspicious Elements
                </button>
                <button 
                  onClick={handleClearHighlights}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-all"
                >
                  <XCircle size={14} />
                  Reset View Filters
                </button>
                <button 
                  onClick={() => navigate(`/report/${caseData.case_id}`)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow shadow-blue-950/20 transition-all"
                >
                  <FileText size={14} />
                  Generate Case Report
                </button>
              </div>
            </div>
          )}

          {/* Investigation logs box at bottom */}
          <div className="border-t border-slate-900 pt-3 mt-auto shrink-0 select-none">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider mb-2.5 block pl-1">Investigation Log</span>
            <div className="bg-slate-900/30 border border-slate-900 p-2.5 rounded-lg max-h-[100px] overflow-y-auto space-y-1 font-mono text-[9px] text-slate-400">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-1.5 hover:text-slate-200 cursor-pointer">
                  <span className="text-slate-600">[{log.time}]</span>
                  <span className="font-bold text-indigo-400">{log.action}</span>
                  <span className="truncate flex-1 font-medium">{log.description}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-slate-600 italic text-center py-2">No logging events registered</p>
              )}
            </div>
          </div>

        </aside>

      </div>

    </div>
  );
}
