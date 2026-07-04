// Manages staggered animations for hierarchical tree rendering

export class AnimationManager {
  constructor(cy) {
    this.cy = cy;
    this.levelMap = new Map(); // level -> nodes in that level
    this.animationDuration = 400;
    this.staggerDelay = 150;
  }

  // Analyze graph structure and build level map
  buildLevelMap() {
    this.levelMap.clear();
    const visited = new Set();
    const queue = [];

    // Start from primary node (no parent)
    const primaryNodes = this.cy.nodes().filter(n => {
      const hasPredecessors = n.indegree() > 0;
      return !hasPredecessors;
    });

    primaryNodes.forEach(n => {
      this.levelMap.set(0, (this.levelMap.get(0) || []).concat(n));
      visited.add(n.id());
      queue.push({ node: n, level: 0 });
    });

    // BFS to assign levels
    while (queue.length > 0) {
      const { node, level } = queue.shift();

      node.successors().nodes().forEach(successor => {
        if (!visited.has(successor.id())) {
          visited.add(successor.id());
          const nextLevel = level + 1;
          this.levelMap.set(nextLevel, (this.levelMap.get(nextLevel) || []).concat(successor));
          queue.push({ node: successor, level: nextLevel });
        }
      });
    }
  }

  // Animate nodes appearing in staggered fashion per level
  animateHierarchyReveal() {
    this.buildLevelMap();

    // Hide all nodes initially
    this.cy.nodes().style('opacity', 0);

    const levels = Array.from(this.levelMap.keys()).sort((a, b) => a - b);
    let totalDelay = 0;

    levels.forEach(level => {
      const nodesAtLevel = this.levelMap.get(level) || [];
      totalDelay += this.staggerDelay;

      setTimeout(() => {
        nodesAtLevel.forEach((node, idx) => {
          setTimeout(() => {
            node.animate({
              style: { opacity: 1 }
            }, {
              duration: this.animationDuration,
              easing: 'ease-in-out'
            });
          }, idx * (this.staggerDelay / 3));
        });
      }, totalDelay);
    });

    // Animate edges after nodes
    setTimeout(() => {
      this.cy.edges().forEach((edge, idx) => {
        setTimeout(() => {
          edge.animate({
            style: { opacity: 0.7 }
          }, {
            duration: this.animationDuration,
            easing: 'ease-in-out'
          });
        }, idx * (this.staggerDelay / 4));
      });
    }, totalDelay + this.staggerDelay * 2);
  }

  // Pulse animation for highlighting
  pulseNode(nodeId, count = 2) {
    const node = this.cy.getElementById(nodeId);
    if (node.length === 0) return;

    let pulses = 0;
    const pulse = () => {
      node.animate({
        style: { 'border-width': 6 }
      }, {
        duration: 200,
        complete: () => {
          node.animate({
            style: { 'border-width': 2 }
          }, {
            duration: 200,
            complete: () => {
              pulses++;
              if (pulses < count) {
                setTimeout(pulse, 100);
              }
            }
          });
        }
      });
    };
    pulse();
  }

  // Cascade animation for path highlighting
  cascadeHighlight(nodeId, direction = 'downstream') {
    const startNode = this.cy.getElementById(nodeId);
    if (startNode.length === 0) return;

    const visited = new Set();
    const highlightNode = (node, delay) => {
      setTimeout(() => {
        node.addClass('highlighted');
        visited.add(node.id());

        const nextNodes = direction === 'downstream'
          ? node.successors().nodes()
          : node.predecessors().nodes();

        nextNodes.forEach((nextNode, idx) => {
          if (!visited.has(nextNode.id())) {
            const edge = direction === 'downstream'
              ? this.cy.edges().stdFilter(e => e.source().id() === node.id() && e.target().id() === nextNode.id())
              : this.cy.edges().stdFilter(e => e.source().id() === nextNode.id() && e.target().id() === node.id());

            if (edge.length > 0) {
              edge[0].addClass('highlighted');
            }

            highlightNode(nextNode, 150 + (idx * 100));
          }
        });
      }, delay);
    };

    startNode.addClass('highlighted');
    startNode.connectedEdges().addClass('highlighted');
    highlightNode(startNode, 150);
  }

  // Smooth pan to node
  panToNode(nodeId, duration = 500) {
    const node = this.cy.getElementById(nodeId);
    if (node.length === 0) return;

    const pos = node.position();
    this.cy.animate({
      pan: {
        x: this.cy.width() / 2 - pos.x,
        y: this.cy.height() / 2 - pos.y
      }
    }, {
      duration,
      easing: 'ease-in-out'
    });
  }

  // Zoom to node with padding
  zoomToNode(nodeId, duration = 500, padding = 100) {
    const node = this.cy.getElementById(nodeId);
    if (node.length === 0) return;

    this.cy.animate({
      fit: {
        eles: node,
        padding
      }
    }, {
      duration,
      easing: 'ease-in-out'
    });
  }

  // Fade in/out all elements smoothly
  fadeElements(elements, toOpacity = 1, duration = 300) {
    elements.animate({
      style: { opacity: toOpacity }
    }, {
      duration,
      easing: 'ease-in-out'
    });
  }
}

export default AnimationManager;
