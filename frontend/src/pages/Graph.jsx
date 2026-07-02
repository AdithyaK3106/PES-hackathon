import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataStore } from '../hooks/useDataStore';
import GraphModule from '../modules/GraphModule';
import ErrorBoundary from '../components/ErrorBoundary';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function Graph() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { fetchInvestigation } = useDataStore();

  const [caseDetails, setCaseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchInvestigation(caseId);
        setCaseDetails(data);
      } catch (err) {
        setError(err.message || 'Failed to load case graph details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-xs font-semibold">Reconstructing Money Flow Graph Topology...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-6 text-center">
          <AlertTriangle className="text-red-500 mx-auto mb-4" size={40} />
          <h3 className="text-xl font-bold text-red-200">Failed to Load Graph</h3>
          <p className="text-slate-400 mt-2 text-sm">{error}</p>
          <button 
            onClick={() => navigate('/investigations')}
            className="mt-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-lg text-sm transition-all flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={14} /> Back to Investigations
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <GraphModule key={caseId} caseDetails={caseDetails} />
    </ErrorBoundary>
  );
}
