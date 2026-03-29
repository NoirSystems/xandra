/**
 * Composition Grapher
 *
 * Builds a tree of how x- classes are composed across the codebase.
 * Detects patterns, anomalies, and over/under-represented compositions.
 */

/**
 * @typedef {Object} CompositionNode
 * @property {string} name - class name or tag name
 * @property {number} count - how many times this appears as a child
 * @property {number} percent - percentage of parent's children that are this
 * @property {Map<string, CompositionNode>} children
 */

/**
 * Build the composition graph from scan results
 */
export function buildGraph(scanResults) {
  const graph = new Map(); // top-level x-class → CompositionNode

  for (const scan of scanResults) {
    for (const el of scan.elements) {
      if (el.xClasses.length === 0) continue;

      for (const cls of el.xClasses) {
        // Track this class as a parent
        if (!graph.has(cls)) {
          graph.set(cls, {
            name: cls,
            count: 0,
            children: new Map(),
            files: new Set(),
          });
        }
        const node = graph.get(cls);
        node.count++;
        node.files.add(el.file);

        // Record children
        recordChildren(node, el.children);
      }
    }
  }

  // Calculate percentages
  for (const [, node] of graph) {
    calculatePercents(node);
  }

  return graph;
}

function recordChildren(parentNode, children) {
  for (const child of children) {
    // For children with x- classes, use the x- class as the key
    // For children without x- classes but with semantic tags, use the tag
    const keys = child.xClasses.length > 0
      ? child.xClasses
      : isSemanticTag(child.tag) ? [`<${child.tag}>`] : [];

    for (const key of keys) {
      if (!parentNode.children.has(key)) {
        parentNode.children.set(key, {
          name: key,
          count: 0,
          children: new Map(),
          files: new Set(),
        });
      }
      const childNode = parentNode.children.get(key);
      childNode.count++;
      childNode.files.add(child.file);

      // Recurse into grandchildren
      recordChildren(childNode, child.children);
    }
  }
}

function isSemanticTag(tag) {
  return ['header', 'footer', 'nav', 'main', 'aside', 'section', 'article',
    'a', 'img', 'picture', 'video', 'figure', 'figcaption',
    'form', 'fieldset', 'legend', 'table', 'ul', 'ol', 'li'].includes(tag);
}

function calculatePercents(node) {
  if (node.count === 0) return;
  for (const [, child] of node.children) {
    child.percent = Math.round((child.count / node.count) * 100);
    calculatePercents(child);
  }
}

// ---------------------------------------------------------------------------
// Pattern detection
// ---------------------------------------------------------------------------

/**
 * Detect repeated composition patterns
 *
 * A pattern is a parent class with a consistent set of children.
 * "Consistent" = appears in >60% of instances.
 */
export function detectPatterns(graph, minCount = 3, minPercent = 50) {
  const patterns = [];

  for (const [cls, node] of graph) {
    if (node.count < minCount) continue;

    // Find children that appear in >minPercent of instances
    const consistentChildren = [];
    for (const [childName, childNode] of node.children) {
      if (childNode.percent >= minPercent) {
        consistentChildren.push({
          name: childName,
          percent: childNode.percent,
          count: childNode.count,
          // Sub-children
          subChildren: getConsistentChildren(childNode, minPercent),
        });
      }
    }

    if (consistentChildren.length >= 2) {
      patterns.push({
        parent: cls,
        parentCount: node.count,
        children: consistentChildren,
        signature: `${cls} > (${consistentChildren.map(c => c.name).join(' + ')})`,
      });
    }
  }

  return patterns.sort((a, b) => b.parentCount - a.parentCount);
}

function getConsistentChildren(node, minPercent) {
  const result = [];
  for (const [name, child] of node.children) {
    if (child.percent >= minPercent) {
      result.push({ name, percent: child.percent, count: child.count });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Anomaly detection
// ---------------------------------------------------------------------------

/**
 * Detect unusual compositions
 */
export function detectAnomalies(graph, scanResults) {
  const anomalies = [];

  for (const scan of scanResults) {
    for (const el of scan.elements) {
      // Anomaly: element with x- classes that has very few children for a grid
      for (const cls of el.xClasses) {
        if (cls.match(/^x-block-[234]$/)) {
          const directXChildren = el.children.filter(c => c.xClasses.length > 0 || c.tag !== '#text');
          const expectedMin = parseInt(cls.replace('x-block-', ''));
          if (directXChildren.length > 0 && directXChildren.length < expectedMin) {
            anomalies.push({
              type: 'UNDERFLOW',
              message: `${cls} has ${directXChildren.length} children but expects ${expectedMin}+`,
              file: el.file,
              line: el.line,
              class: cls,
            });
          }
        }
      }

      // Anomaly: deeply nested same class
      if (el.xClasses.length > 0 && el.parentXClasses.length > 0) {
        for (const cls of el.xClasses) {
          if (el.parentXClasses.includes(cls) && !el.hasNs) {
            anomalies.push({
              type: 'SELF_NESTING',
              message: `${cls} nested inside itself — unusual, add data-ns if intentional`,
              file: el.file,
              line: el.line,
              class: cls,
            });
          }
        }
      }
    }
  }

  return anomalies;
}

// ---------------------------------------------------------------------------
// Coverage analysis
// ---------------------------------------------------------------------------

/**
 * Analyze what compositions exist vs what's possible
 */
export function analyzeCoverage(graph, registry) {
  const usedCompositions = new Set();

  for (const [parentCls, node] of graph) {
    for (const [childName] of node.children) {
      usedCompositions.add(`${parentCls} > ${childName}`);
    }
  }

  // Compare with known valid compositions from registry
  const unusedValid = [];
  for (const comp of registry.constructor === Object ? [] : []) {
    if (!usedCompositions.has(comp)) {
      unusedValid.push(comp);
    }
  }

  return {
    total: usedCompositions.size,
    used: [...usedCompositions],
    // We don't track "unused" since the valid set is just guidance, not exhaustive
  };
}

/**
 * Format graph as tree string
 */
export function formatGraphTree(graph, maxDepth = 3, minPercent = 10) {
  const lines = [];

  // Sort by usage count
  const sorted = [...graph.entries()]
    .filter(([, n]) => n.count >= 2)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [cls, node] of sorted) {
    lines.push(`${cls} (${node.count} uses)`);
    formatNodeChildren(node, lines, ' ', maxDepth, 1, minPercent);
    lines.push('');
  }

  return lines.join('\n');
}

function formatNodeChildren(node, lines, prefix, maxDepth, currentDepth, minPercent) {
  if (currentDepth > maxDepth) return;

  const children = [...node.children.entries()]
    .filter(([, c]) => c.percent >= minPercent)
    .sort((a, b) => b[1].percent - a[1].percent);

  for (let i = 0; i < children.length; i++) {
    const [name, child] = children[i];
    const isLast = i === children.length - 1;
    const connector = isLast ? '└─' : '├─';
    const nextPrefix = prefix + (isLast ? '  ' : '│ ');

    lines.push(`${prefix}${connector} ${name} (${child.percent}% — ${child.count}/${node.count})`);
    formatNodeChildren(child, lines, nextPrefix, maxDepth, currentDepth + 1, minPercent);
  }
}
