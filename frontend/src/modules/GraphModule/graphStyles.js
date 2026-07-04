export const getRiskColors = (risk, nodeType) => {
  const t = String(nodeType || '').toLowerCase();
  if (t === 'person') return { bg: '#a855f7', border: '#7e22ce' }; // Purple
  if (t === 'upi_id') return { bg: '#14b8a6', border: '#0d9488' }; // Teal
  if (t === 'merchant') return { bg: '#f97316', border: '#ea580c' }; // Orange
  if (t === 'bank') return { bg: '#6366f1', border: '#4f46e5' }; // Indigo

  const r = Number(risk || 0);
  if (r >= 70) return { bg: '#ef4444', border: '#b91c1c' }; // Red / High
  if (r >= 40) return { bg: '#f59e0b', border: '#d97706' }; // Amber / Medium
  if (r > 0) return { bg: '#10b981', border: '#047857' };   // Green / Low
  return { bg: '#64748b', border: '#475569' };             // Gray / Unknown / External
};

export const getShape = (nodeType) => {
  const t = String(nodeType || '').toLowerCase();
  if (t === 'person') return 'diamond';
  if (t === 'upi_id') return 'hexagon';
  if (t === 'merchant') return 'rectangle';
  if (t === 'bank') return 'rectangle';
  if (t === 'ifsc') return 'triangle';
  return 'ellipse'; // default for account
};

export const getPrimaryNodeSize = () => 120;

export const graphStyles = [
  {
    selector: 'node',
    style: {
      'label': 'data(displayLabel)',
      'shape': (node) => getShape(node.data('node_type')),
      'background-color': (node) => getRiskColors(node.data('risk'), node.data('node_type')).bg,
      'border-width': 2,
      'border-color': (node) => getRiskColors(node.data('risk'), node.data('node_type')).border,
      'color': '#fff',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': 9,
      'font-weight': 'bold',
      'width': 75,
      'height': 75,
      'text-outline-width': 2,
      'text-outline-color': '#0f172a',
      'text-wrap': 'wrap',
      'text-max-width': 120,
      'transition-property': 'background-color, border-color, border-width, width, height',
      'transition-duration': '0.3s',
      'z-index': 10
    }
  },
  {
    selector: 'node[is_primary="true"]',
    style: {
      'width': getPrimaryNodeSize(),
      'height': getPrimaryNodeSize(),
      'border-width': 4,
      'font-size': 11,
      'font-weight': 'bold',
      'background-color': '#3b82f6',
      'border-color': '#1e40af',
      'box-shadow': '0 0 30px rgba(59, 130, 246, 0.6)',
      'z-index': 100
    }
  },
  {
    selector: 'edge',
    style: {
      'label': '',
      'width': (edge) => {
        const amt = Number(edge.data('amount') || 0);
        return Math.min(8, 2.5 + Math.log10(Math.max(1, amt / 1000)));
      },
      'line-color': '#64748b',
      'target-arrow-color': '#64748b',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'control-point-step-size': 60,
      'font-size': 9,
      'font-weight': 'bold',
      'text-rotation': 'autorotate',
      'text-margin-y': -14,
      'text-background-color': '#0f172a',
      'text-background-opacity': 0.95,
      'text-background-padding': 3,
      'text-border-color': '#1e293b',
      'text-border-width': 1,
      'text-border-opacity': 0.8,
      'opacity': 0.7,
      'arrow-scale': 1.0,
      'z-index': 5,
      'transition-property': 'line-color, target-arrow-color, opacity, width',
      'transition-duration': '0.2s'
    }
  },
  {
    selector: 'edge.self-transfer',
    style: {
      'line-style': 'dashed',
      'line-color': '#3b82f6',
      'target-arrow-color': '#3b82f6',
      'curve-style': 'bezier',
      'control-point-step-size': 40,
      'opacity': 0.9
    }
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-width': 5,
      'border-color': '#3b82f6',
      'width': 85,
      'height': 85,
      'z-index': 100,
      'box-shadow': '0 0 20px rgba(59, 130, 246, 0.8)'
    }
  },
  {
    selector: 'edge.highlighted',
    style: {
      'line-color': '#3b82f6',
      'target-arrow-color': '#3b82f6',
      'width': 5,
      'opacity': 1,
      'z-index': 90
    }
  },
  {
    selector: 'node.suspicious-flag',
    style: {
      'border-width': 6,
      'border-color': '#ef4444',
      'width': 85,
      'height': 85,
      'box-shadow': '0 0 20px rgba(239, 68, 68, 0.8)'
    }
  },
  {
    selector: 'edge.suspicious-flag',
    style: {
      'line-color': '#ef4444',
      'target-arrow-color': '#ef4444',
      'width': 5,
      'opacity': 1
    }
  },
  {
    selector: 'edge.show-label',
    style: {
      'label': 'data(label)',
      'opacity': 1,
      'z-index': 110,
      'line-color': '#3b82f6',
      'target-arrow-color': '#3b82f6'
    }
  },
  {
    selector: 'node:parent',
    style: {
      'background-color': '#1e293b',
      'border-width': 2,
      'border-color': '#475569'
    }
  }
];
