import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Printer, FileText, AlertTriangle, CheckCircle, 
  TrendingUp, Activity, User, CreditCard, Building, ShieldAlert, 
  ChevronRight, Calendar, Landmark, Info
} from 'lucide-react';
import { useDataStore } from '../hooks/useDataStore';

export default function Report() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { fetchReport, fetchInvestigation } = useDataStore();

  const [report, setReport] = useState(null);
  const [caseDetails, setCaseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const reportData = await fetchReport(caseId);
        const detailData = await fetchInvestigation(caseId);
        setReport(reportData);
        setCaseDetails(detailData);
      } catch (err) {
        setError(err.message || 'Failed to load report details.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [caseId]);

  const handlePrint = () => {
    window.print();
  };

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

  const getRiskColor = (level) => {
    const l = String(level).toUpperCase();
    if (l === 'CRITICAL') return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (l === 'HIGH') return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    if (l === 'MEDIUM') return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  };

  const getPatternSeverityColor = (severity) => {
    const s = String(severity).toUpperCase();
    if (s === 'HIGH') return 'bg-red-500/10 text-red-400 border border-red-500/25';
    if (s === 'MEDIUM') return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
    return 'bg-blue-500/10 text-blue-400 border border-blue-500/25';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-sm font-semibold">Generating Investigation Report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-6 text-center">
          <AlertTriangle className="text-red-500 mx-auto mb-4" size={40} />
          <h3 className="text-xl font-bold text-red-200">Error Loading Report</h3>
          <p className="text-slate-400 mt-2 text-sm">{error}</p>
          <button 
            onClick={() => navigate('/investigations')}
            className="mt-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-lg text-sm transition-all"
          >
            Back to Investigations
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 text-gray-200 print:p-0 print:text-black print:bg-white">
      {/* Header Controls - Hidden in Print */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6 print:hidden">
        <button 
          onClick={() => navigate('/investigations')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Investigations
        </button>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate(`/graph/${caseId}`)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-700 transition-all"
          >
            Explore Money Flow Graph
          </button>
          <button 
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
          >
            <Printer size={16} />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Report Title Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 print:border-none print:bg-transparent print:p-0">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">Financial Intelligence Unit</span>
          <h1 className="text-3xl font-black mt-1 tracking-tight text-white print:text-black">Investigation Case Report</h1>
          <p className="text-xs text-slate-500 font-mono mt-1">CASE ID: {caseId} • Generated {new Date().toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl border text-center font-bold ${getRiskColor(report.investigation_risk?.level)}`}>
            <span className="text-[10px] uppercase block tracking-wider opacity-80">Risk Level</span>
            <span className="text-lg tracking-tight font-black">{report.investigation_risk?.level}</span>
          </div>
          <div className="bg-slate-800 border border-slate-750 px-4 py-2 rounded-xl text-center print:border-slate-300">
            <span className="text-[10px] uppercase block tracking-wider text-slate-400 print:text-slate-600">Risk Score</span>
            <span className="text-lg font-black text-indigo-400 print:text-black">{report.investigation_risk?.score}/100</span>
          </div>
        </div>
      </div>

      {/* 1. Executive Summary */}
      <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-4 print:border-slate-300">
        <h2 className="text-sm uppercase font-black tracking-widest text-slate-400 border-b border-slate-800 pb-2 print:text-black print:border-slate-300">
          1. Executive Summary
        </h2>
        <p className="text-sm leading-relaxed text-slate-300 font-medium print:text-black">
          {report.executive_summary}
        </p>
      </section>

      {/* 2 & 3. Investigation Risk and Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Risk Indicators */}
        <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-4 print:border-slate-300">
          <h2 className="text-sm uppercase font-black tracking-widest text-slate-400 border-b border-slate-800 pb-2 print:text-black print:border-slate-300">
            2. Primary Risk Drivers
          </h2>
          <ul className="space-y-3">
            {report.investigation_risk?.explanation?.map((exp, idx) => (
              <li key={idx} className="flex gap-2 text-xs text-slate-300 print:text-black">
                <ShieldAlert className="text-indigo-400 shrink-0 mt-0.5" size={14} />
                <span>{exp}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Patterns */}
        <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-4 print:border-slate-300">
          <h2 className="text-sm uppercase font-black tracking-widest text-slate-400 border-b border-slate-800 pb-2 print:text-black print:border-slate-300">
            3. Anomalous Behavioral Patterns
          </h2>
          {report.detected_patterns && report.detected_patterns.length > 0 ? (
            <div className="space-y-3">
              {report.detected_patterns.map((pattern, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-4 flex justify-between gap-4 print:border-slate-300 print:bg-slate-50">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-200 print:text-black">{pattern.name}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed print:text-slate-700">{pattern.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${getPatternSeverityColor(pattern.severity)}`}>
                      {pattern.severity}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Conf: {(pattern.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/40 p-4 rounded-xl border border-dashed border-slate-800">
              <CheckCircle size={16} className="text-emerald-500" />
              <span>No distinct behavioral patterns flagged.</span>
            </div>
          )}
        </section>
      </div>

      {/* 4. Money Flow Summary */}
      <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-6 print:border-slate-300">
        <h2 className="text-sm uppercase font-black tracking-widest text-slate-400 border-b border-slate-800 pb-2 print:text-black print:border-slate-300">
          4. Money Flow Matrix
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl print:border-slate-350">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Credits</span>
            <span className="text-lg font-black text-emerald-400 mt-1 block">
              {formatINR(report.money_flow_summary?.total_inflow)}
            </span>
          </div>
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl print:border-slate-350">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Debits</span>
            <span className="text-lg font-black text-red-400 mt-1 block">
              {formatINR(report.money_flow_summary?.total_outflow)}
            </span>
          </div>
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl print:border-slate-350">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Net Velocity</span>
            <span className={`text-lg font-black mt-1 block ${report.money_flow_summary?.net_flow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatINR(report.money_flow_summary?.net_flow)}
            </span>
          </div>
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl print:border-slate-350">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Unique Counterparties</span>
            <span className="text-lg font-black text-slate-200 mt-1 block print:text-black">
              {report.money_flow_summary?.unique_counterparties}
            </span>
          </div>
        </div>

        {/* Visual Bar of Credits vs Debits */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-emerald-400">CREDITS INFLOW ({((report.money_flow_summary?.total_inflow / (report.money_flow_summary?.total_inflow + report.money_flow_summary?.total_outflow || 1)) * 100).toFixed(0)}%)</span>
            <span className="text-red-400">DEBITS OUTFLOW ({((report.money_flow_summary?.total_outflow / (report.money_flow_summary?.total_inflow + report.money_flow_summary?.total_outflow || 1)) * 100).toFixed(0)}%)</span>
          </div>
          <div className="h-3 w-full bg-slate-900 rounded-full flex overflow-hidden border border-slate-850 print:border-slate-300">
            <div 
              style={{ width: `${(report.money_flow_summary?.total_inflow / (report.money_flow_summary?.total_inflow + report.money_flow_summary?.total_outflow || 1)) * 100}%` }}
              className="bg-emerald-500 h-full"
            />
            <div 
              style={{ width: `${(report.money_flow_summary?.total_outflow / (report.money_flow_summary?.total_inflow + report.money_flow_summary?.total_outflow || 1)) * 100}%` }}
              className="bg-red-500 h-full"
            />
          </div>
        </div>
      </section>

      {/* 5. Top Beneficiaries */}
      <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-4 print:border-slate-300">
        <h2 className="text-sm uppercase font-black tracking-widest text-slate-400 border-b border-slate-800 pb-2 print:text-black print:border-slate-300">
          5. Top Outbound Beneficiaries
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 print:border-slate-300">
                <th className="py-3 px-4">Beneficiary Entity / Identifier</th>
                <th className="py-3 px-4 text-right">Transactions Count</th>
                <th className="py-3 px-4 text-right">Total Transferred</th>
              </tr>
            </thead>
            <tbody>
              {report.top_beneficiaries?.map((ben, idx) => (
                <tr key={idx} className="border-b border-slate-850 hover:bg-slate-900/40 transition-colors print:border-slate-200">
                  <td className="py-3 px-4 font-semibold font-mono text-slate-200 print:text-black">{ben.account}</td>
                  <td className="py-3 px-4 text-right font-medium">{ben.tx_count}</td>
                  <td className="py-3 px-4 text-right font-bold text-red-400 print:text-black">{formatINR(ben.total_received)}</td>
                </tr>
              ))}
              {!report.top_beneficiaries?.length && (
                <tr>
                  <td colSpan="3" className="py-6 text-center text-slate-500">No outbound beneficiaries detected.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Extracted Entities */}
      <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-6 print:border-slate-300">
        <h2 className="text-sm uppercase font-black tracking-widest text-slate-400 border-b border-slate-800 pb-2 print:text-black print:border-slate-300">
          6. Extracted Intelligence Entities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Names & UPIs */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase font-extrabold text-slate-500 flex items-center gap-1.5">
              <User size={14} /> Associated Names
            </h3>
            <div className="space-y-2">
              {report.extracted_entities?.names?.map((name, idx) => (
                <div key={idx} className="bg-slate-900/60 border border-slate-800/50 p-2.5 rounded-lg text-xs print:border-slate-200">
                  <p className="font-bold text-slate-300 print:text-black">{name.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Found in {name.source_tx_ids?.length} transactions</p>
                </div>
              ))}
              {!report.extracted_entities?.names?.length && <p className="text-xs text-slate-655 italic">None found</p>}
            </div>
          </div>

          {/* UPI Identifiers */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase font-extrabold text-slate-500 flex items-center gap-1.5">
              <CreditCard size={14} /> UPI IDs & Accounts
            </h3>
            <div className="space-y-2">
              {report.extracted_entities?.upi_ids?.map((upi, idx) => (
                <div key={idx} className="bg-slate-900/60 border border-slate-800/50 p-2.5 rounded-lg text-xs print:border-slate-200">
                  <p className="font-bold text-indigo-400 print:text-black font-mono break-all">{upi.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Linked to {upi.linked_accounts?.join(', ') || 'N/A'}</p>
                </div>
              ))}
              {!report.extracted_entities?.upi_ids?.length && <p className="text-xs text-slate-655 italic">None found</p>}
            </div>
          </div>

          {/* Banks & IFSCs */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase font-extrabold text-slate-500 flex items-center gap-1.5">
              <Building size={14} /> Institutions & IFSCs
            </h3>
            <div className="space-y-2">
              {report.extracted_entities?.ifsc_codes?.map((ifsc, idx) => (
                <div key={idx} className="bg-slate-900/60 border border-slate-800/50 p-2.5 rounded-lg text-xs print:border-slate-200">
                  <p className="font-bold text-slate-300 print:text-black font-mono">{ifsc.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">IFSC Routing Signature</p>
                </div>
              ))}
              {report.extracted_entities?.banks?.map((bank, idx) => (
                <div key={idx} className="bg-slate-900/60 border border-slate-800/50 p-2.5 rounded-lg text-xs print:border-slate-200">
                  <p className="font-bold text-slate-300 print:text-black">{bank.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Associated Financial Institution</p>
                </div>
              ))}
              {!report.extracted_entities?.ifsc_codes?.length && !report.extracted_entities?.banks?.length && (
                <p className="text-xs text-slate-655 italic">None found</p>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* 7. Critical Transactions Table */}
      <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-4 print:border-slate-300">
        <h2 className="text-sm uppercase font-black tracking-widest text-slate-400 border-b border-slate-800 pb-2 print:text-black print:border-slate-300">
          7. Flagged Investigation Transactions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 print:border-slate-300">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description / Narration</th>
                <th className="py-3 px-4 text-center">Channel</th>
                <th className="py-3 px-4 text-right">Debit</th>
                <th className="py-3 px-4 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {report.high_risk_transactions?.map((tx, idx) => (
                <tr key={idx} className="border-b border-slate-850 hover:bg-slate-900/40 transition-colors print:border-slate-200">
                  <td className="py-3 px-4 text-slate-400 print:text-black font-mono">
                    {new Date(tx.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-200 print:text-black font-mono max-w-sm truncate" title={tx.description}>
                    {tx.description}
                  </td>
                  <td className="py-3 px-4 text-center font-bold">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] border border-slate-700/50 print:border-slate-300 print:text-black print:bg-slate-100">
                      {tx.channel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-red-400 print:text-black">
                    {tx.is_debit ? formatINR(tx.amount) : ''}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-400 print:text-black">
                    {!tx.is_debit ? formatINR(tx.amount) : ''}
                  </td>
                </tr>
              ))}
              {!report.high_risk_transactions?.length && (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-500">No high risk transactions identified.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 8. Timeline Overview */}
      <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-4 print:border-slate-300">
        <h2 className="text-sm uppercase font-black tracking-widest text-slate-400 border-b border-slate-800 pb-2 print:text-black print:border-slate-300">
          8. Chronological Audit Timeline (Top 50 Events)
        </h2>
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800 print:before:bg-slate-200">
          {report.timeline?.map((evt, idx) => (
            <div key={idx} className="relative group">
              {/* Dot indicator */}
              <div className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-slate-950 flex items-center justify-center transition-all ${
                evt.risk_flag 
                  ? "border-red-500 bg-red-500/20 scale-110 shadow-[0_0_8px_rgba(239,68,68,0.4)]" 
                  : "border-slate-700"
              }`} />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-slate-900/40 hover:bg-slate-900/70 border border-slate-850 p-4 rounded-xl transition-all print:border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-400">{evt.date} {evt.time}</span>
                    <span className="text-[10px] font-mono text-slate-500">• {evt.counterparty}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 print:text-black">{evt.event}</p>
                </div>
                {evt.risk_flag && (
                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start md:self-center shrink-0">
                    Flagged Risk Event
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9 & 10. Parser and Graph Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Parser Stats */}
        <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-4 print:border-slate-300">
          <h2 className="text-sm uppercase font-black tracking-widest text-slate-400 border-b border-slate-800 pb-2 print:text-black print:border-slate-300">
            9. Statement Processing Metrics
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/50">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Source Document</span>
                <span className="text-xs font-bold text-slate-200 break-all">{caseDetails?.case?.source_file || 'statement.pdf'}</span>
              </div>
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/50">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Parser Format</span>
                <span className="text-xs font-bold text-slate-200">{report.parser_statistics?.source_format}</span>
              </div>
            </div>
            
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/50 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Parser Accuracy Confidence</span>
                <span className="text-sm font-bold text-slate-200 mt-1 block">
                  {report.parser_statistics?.confidence}% ({report.parser_statistics?.parsed_rows} / {report.parser_statistics?.total_rows} rows)
                </span>
              </div>
              <div className="h-10 w-10 rounded-full border border-slate-800 flex items-center justify-center bg-slate-950/40">
                <Info size={16} className="text-indigo-400" />
              </div>
            </div>

            {report.parser_statistics?.warnings?.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4">
                <span className="text-[10px] text-amber-500 uppercase font-bold block mb-1">Parser Warnings / Skip Logs</span>
                <ul className="list-disc list-inside space-y-1.5">
                  {report.parser_statistics.warnings.map((warn, i) => (
                    <li key={i} className="text-[11px] text-amber-400/80 leading-normal">{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Graph Stats */}
        <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-4 print:border-slate-300">
          <h2 className="text-sm uppercase font-black tracking-widest text-slate-400 border-b border-slate-800 pb-2 print:text-black print:border-slate-300">
            10. Neural Topology Summary
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/50 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Network Nodes</span>
                <span className="text-lg font-black text-indigo-400 mt-1 block">{report.graph_summary?.total_nodes}</span>
              </div>
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/50 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Network Edges</span>
                <span className="text-lg font-black text-indigo-400 mt-1 block">{report.graph_summary?.total_edges}</span>
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/50">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-3">Nodes Classification</span>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(report.graph_summary?.node_types || {}).map(([type, count]) => (
                  <div key={type} className="bg-slate-950/40 p-2 rounded-lg text-center border border-slate-900">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">{type}</span>
                    <span className="text-xs font-black text-slate-300">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 11. Recommended Next Steps */}
      <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-4 print:border-slate-300">
        <h2 className="text-sm uppercase font-black tracking-widest text-slate-400 border-b border-slate-800 pb-2 print:text-black print:border-slate-300">
          11. Recommended Investigation Protocol
        </h2>
        <ol className="list-decimal list-inside space-y-3">
          {report.recommended_next_steps?.map((step, idx) => (
            <li key={idx} className="text-xs text-slate-300 leading-relaxed font-semibold print:text-black">
              <span className="text-indigo-400 font-bold mr-1.5 font-mono">{idx + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {/* Footer Branding - Printed Only */}
      <div className="hidden print:block text-[10px] text-slate-400 text-center border-t border-slate-200 pt-8 mt-12">
        <span>Sentinel Automated Forensic Workstation Analysis Report • Page 1 of 1</span>
      </div>
    </div>
  );
}
