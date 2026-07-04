import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { graphStyles } from './graphStyles';
import { getRole } from '../../roleStore';
import { maskAccount } from '../../utils/maskAccount';

// Register dagre plugin
cytoscape.use(dagre);

const isSelfTransfer = (edge) => {
  const desc = String(edge.description || '').toUpperCase();
  return desc.includes('SELF') || desc.includes('OWN A/C') || desc.includes('SELF TRANSFER') || edge.from === edge.to;
};

const formatTransactionLabel = (edge) => {
  const amount = Number(edge.amount || 0);
  const channel = edge.channel || 'OTHER';
  const formattedAmount = new Intl.NumberFormat('en-IN').format(amount);
  if (isSelfTransfer(edge)) {
    return `₹${formattedAmount} (Self Transfer)`;
  }
  return `₹${formattedAmount} via ${channel}`;
};

const getGraphBounds = (container) => {
  const width = container?.clientWidth || 800;
  const height = container?.clientHeight || 600;
  const padding = 40;
  return { width, height, padding };
};

const formatINR = (val) => {
  const num = Number(val || 0);
  if (num === 0) return '';
  return '₹' + new Intl.NumberFormat('en-IN').format(num);
};

const getDisplayLabel = (node, primaryId) => {
  const id = String(node.accountId || node.id || node.account_id);
  const name = node.label || id;
  const isRoot = id === primaryId;

  const amount = isRoot
    ? (node.total_outflow || node.total_debits || 0)
    : (node.total_inflow || node.total_outflow || 0);

  const formattedAmount = formatINR(amount);

  if (isRoot) {
    return `${name}\n(Primary)\n${formattedAmount}`;
  }
  return `${name}\n${formattedAmount}`;
};

const GraphCanvas = forwardRef(({ nodes = [], edges = [], onNodeClick }, ref) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const isInitializedRef = useRef(false);
  const onNodeClickRef = useRef(onNodeClick);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const parentMapRef = useRef(new Map());
  const primaryIdRef = useRef('');
  const intermediateNodeIdsRef = useRef(new Set());

  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  // Process nodes and identify hierarchy
  useEffect(() => {
    if (nodes.length === 0) return;

    // Identify Primary Account (Root)
    const primaryNode = nodes.find(n => n.node_type === 'account' && n.label?.includes('(Owner)'))
      || nodes.find(n => n.nodeType === 'account' && n.label?.includes('(Owner)'))
      || nodes.find(n => n.account_id && n.label?.includes('(Owner)'))
      || nodes[0];

    const primaryId = primaryNode ? String(primaryNode.accountId || primaryNode.id || primaryNode.account_id) : '';
    primaryIdRef.current = primaryId;

    // Classify into Intermediate and Leaf
    const intermediates = [];
    const leaves = [];
    nodes.forEach(n => {
      const id = String(n.accountId || n.id || n.account_id);
      if (id === primaryId) return;

      const type = String(n.nodeType || n.node_type || '').toLowerCase();
      const risk = Number(n.risk || 0);

      if (type === 'merchant' || type === 'upi_id' || type === 'ifsc' || type === 'bank' || risk < 40) {
        leaves.push(n);
      } else {
        intermediates.push(n);
      }
    });

    const intermediateIds = new Set(intermediates.map(n => String(n.accountId || n.id || n.account_id)));
    intermediateNodeIdsRef.current = intermediateIds;

    // Build parent-child relationships
    const parentMap = new Map();
    if (intermediates.length > 0) {
      leaves.forEach((leaf, idx) => {
        const leafId = String(leaf.accountId || leaf.id || leaf.account_id);
        const parent = intermediates[idx % intermediates.length];
        const parentId = String(parent.accountId || parent.id || parent.account_id);
        parentMap.set(leafId, parentId);
      });
    } else {
      leaves.forEach(leaf => {
        const leafId = String(leaf.accountId || leaf.id || leaf.account_id);
        parentMap.set(leafId, primaryId);
      });
    }
    parentMapRef.current = parentMap;
  }, [nodes]);

  useImperativeHandle(ref, () => ({
    highlightNode: (nodeId, duration = 1000) => {
      const cy = cyRef.current;
      if (!cy) return;

      const parentId = parentMapRef.current.get(nodeId);
      if (parentId && collapsedNodes.has(parentId)) {
        setCollapsedNodes(prev => {
          const next = new Set(prev);
          next.delete(parentId);
          return next;
        });
      }

      const node = cy.getElementById(nodeId);
      if (node.length > 0) {
        node.animate({
          style: { 'border-width': 10, 'border-color': '#3b82f6' }
        }, {
          duration: 200,
          complete: () => {
            setTimeout(() => {
              node.animate({
                style: {
                  'border-width': 2,
                  'border-color': '#1d4ed8'
                }
              }, { duration: 400 });
            }, duration);
          }
        });
      }
    },
    traceMoneyFlow: (nodeId) => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.elements().removeClass('highlighted');
      if (!nodeId) return;

      const root = cy.getElementById(nodeId);
      if (root.length === 0) return;

      const nodesToExpand = new Set();

      cy.elements().bfs({
        roots: root,
        visit: (v, e) => {
          v.addClass('highlighted');
          if (e) e.addClass('highlighted');

          const vId = v.id();
          const parentId = parentMapRef.current.get(vId);
          if (parentId && collapsedNodes.has(parentId)) {
            nodesToExpand.add(parentId);
          }
        },
        directed: true
      });

      if (nodesToExpand.size > 0) {
        setCollapsedNodes(prev => {
          const next = new Set(prev);
          nodesToExpand.forEach(id => next.delete(id));
          return next;
        });
      }
    },
    expandNetwork: (nodeId) => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.elements().removeClass('highlighted');
      if (!nodeId) return;

      const root = cy.getElementById(nodeId);
      if (root.length === 0) return;

      root.addClass('highlighted');
      const neighbors1 = root.neighborhood();
      neighbors1.addClass('highlighted');

      const nodesToExpand = new Set();

      neighbors1.nodes().forEach(n => {
        n.neighborhood().addClass('highlighted');

        const nId = n.id();
        const parentId = parentMapRef.current.get(nId);
        if (parentId && collapsedNodes.has(parentId)) {
          nodesToExpand.add(parentId);
        }
      });

      if (collapsedNodes.has(nodeId)) {
        nodesToExpand.add(nodeId);
      }

      if (nodesToExpand.size > 0) {
        setCollapsedNodes(prev => {
          const next = new Set(prev);
          nodesToExpand.forEach(id => next.delete(id));
          return next;
        });
      }
    },
    highlightSuspicious: (riskThreshold = 60) => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.elements().removeClass('suspicious-flag');

      const nodesToExpand = new Set();

      cy.nodes().forEach(n => {
        const risk = Number(n.data('risk') || 0);
        if (risk >= riskThreshold) {
          n.addClass('suspicious-flag');
          n.connectedEdges().addClass('suspicious-flag');

          const nId = n.id();
          const parentId = parentMapRef.current.get(nId);
          if (parentId && collapsedNodes.has(parentId)) {
            nodesToExpand.add(parentId);
          }
        }
      });

      if (nodesToExpand.size > 0) {
        setCollapsedNodes(prev => {
          const next = new Set(prev);
          nodesToExpand.forEach(id => next.delete(id));
          return next;
        });
      }
    },
    clearHighlights: () => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.elements().removeClass('highlighted').removeClass('suspicious-flag');
    }
  }));

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: graphStyles,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false
    });

    cyRef.current = cy;
    isInitializedRef.current = true;

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeId = node.id();

      if (intermediateNodeIdsRef.current.has(nodeId)) {
        setCollapsedNodes(prev => {
          const next = new Set(prev);
          if (next.has(nodeId)) {
            next.delete(nodeId);
          } else {
            next.add(nodeId);
          }
          return next;
        });
      }

      onNodeClickRef.current?.({
        id: node.id(),
        accountId: node.data('account_id') || node.id(),
        nodeType: node.data('node_type') || 'account',
        label: node.data('label') || node.id(),
        risk: node.data('risk') || 0,
        status: node.data('status')
      });
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.edges().removeClass('show-label');
        onNodeClickRef.current?.(null);
      }
    });

    cy.on('mouseover tap', 'edge', (evt) => {
      cy.edges().removeClass('show-label');
      evt.target.addClass('show-label');
    });

    cy.on('mouseout', 'edge', (evt) => {
      evt.target.removeClass('show-label');
    });

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
      isInitializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const cy = cyRef.current;
    if (!container || !cy || !window.ResizeObserver) return undefined;

    const observer = new ResizeObserver(() => {
      cy.resize();
      if (nodes.length > 0) {
        cy.fit(cy.elements(':visible'), getGraphBounds(container).padding);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [nodes]);

  // Sync nodes and edges with DAG layout
  useEffect(() => {
    const cy = cyRef.current;
    const container = containerRef.current;
    if (!cy || !isInitializedRef.current || nodes.length === 0) return;

    cy.batch(() => {
      const currentIds = new Set();
      const primaryId = primaryIdRef.current;
      const parentMap = parentMapRef.current;

      // Add/Update Nodes
      nodes.forEach((item) => {
        const nodeId = String(item.accountId || item.id || item.account_id);
        currentIds.add(nodeId);

        const displayLabel = getDisplayLabel(item, primaryId);
        const isPrimary = nodeId === primaryId;

        const existing = cy.getElementById(nodeId);
        if (existing.length > 0) {
          existing.data({ ...item, displayLabel, is_primary: isPrimary ? 'true' : 'false' });
        } else {
          cy.add({
            data: {
              ...item,
              id: nodeId,
              displayLabel,
              is_primary: isPrimary ? 'true' : 'false'
            }
          });
        }
      });

      // Add/Update Edges
      edges.forEach((edge) => {
        const edgeId = String(edge.id || edge.tx_id || `${edge.source || edge.from}-${edge.target || edge.to}`);
        currentIds.add(edgeId);

        const src = String(edge.source || edge.from);
        const tgt = String(edge.target || edge.to);

        let newSrc = src;
        let newTgt = tgt;

        if (!isSelfTransfer(edge)) {
          if (src === primaryId && parentMap.has(tgt)) {
            newSrc = parentMap.get(tgt);
          } else if (tgt === primaryId && parentMap.has(src)) {
            newTgt = parentMap.get(src);
          }
        }

        const edgeData = {
          ...edge,
          source: newSrc,
          target: newTgt,
          from: newSrc,
          to: newTgt
        };

        const label = formatTransactionLabel(edgeData);
        const classes = isSelfTransfer(edgeData) ? 'self-transfer' : '';

        const existing = cy.getElementById(edgeId);
        if (existing.length > 0) {
          existing.data({ ...edgeData, label });
          existing.classes(classes);
        } else {
          cy.add({
            data: {
              ...edgeData,
              id: edgeId,
              label,
              source: newSrc,
              target: newTgt
            },
            classes
          });
        }
      });

      // Remove stale elements
      cy.elements().forEach((ele) => {
        if (!currentIds.has(ele.id())) {
          ele.remove();
        }
      });

      // Apply hierarchical DAG layout
      const layout = cy.layout({
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 80,
        rankSep: 140,
        edgeSep: 40,
        animate: true,
        animationDuration: 700,
        fit: true,
        padding: 40,
        spacingFactor: 1.5
      });

      layout.run();
    });
  }, [nodes, edges]);

  // Update visibility based on collapsed state
  useEffect(() => {
    const cy = cyRef.current;
    const container = containerRef.current;
    if (!cy || !isInitializedRef.current) return;

    cy.batch(() => {
      cy.elements().style('display', 'element');

      collapsedNodes.forEach(parentId => {
        const childrenIds = [];
        parentMapRef.current.forEach((pId, childId) => {
          if (pId === parentId) {
            childrenIds.push(childId);
          }
        });

        childrenIds.forEach(childId => {
          const childNode = cy.getElementById(childId);
          if (childNode.length > 0) {
            childNode.style('display', 'none');
            childNode.connectedEdges().style('display', 'none');
          }
        });
      });
    });

    setTimeout(() => {
      cy.animate({
        fit: {
          eles: cy.elements(':visible'),
          padding: getGraphBounds(container).padding
        }
      }, { duration: 400 });
    }, 50);
  }, [collapsedNodes]);

  return (
    <div
      ref={containerRef}
      className="graph-canvas"
      style={{
        width: '100%',
        height: '100%',
        background: '#090d16',
        textAlign: 'left'
      }}
    />
  );
});

GraphCanvas.displayName = 'GraphCanvas';

export default React.memo(GraphCanvas);
