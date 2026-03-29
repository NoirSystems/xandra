/**
 * NS Auditor
 *
 * Aggregates ns elements across the codebase, clusters data-ns reasons
 * by similarity, ranks by frequency, and suggests new x- classes.
 */

/**
 * @typedef {Object} NsElement
 * @property {string} file
 * @property {number} line
 * @property {string|null} reason
 * @property {boolean} boundary
 * @property {string[]} xClasses - x- classes on the ns element
 * @property {string[]} parentXClasses
 */

/**
 * Collect all ns elements from scan results
 */
export function collectNs(scanResults) {
  const elements = [];

  for (const scan of scanResults) {
    for (const el of scan.elements) {
      if (el.hasNs) {
        elements.push({
          file: el.file,
          line: el.line,
          reason: el.nsReason,
          boundary: el.nsBoundary,
          xClasses: el.xClasses,
          parentXClasses: el.parentXClasses,
        });
      }
    }
  }

  return elements;
}

/**
 * Group ns elements by reason
 */
export function groupByReason(nsElements) {
  const groups = new Map();

  for (const el of nsElements) {
    const key = el.reason || '__missing__';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(el);
  }

  // Sort by frequency (most common first)
  return [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([reason, elements]) => ({
      reason: reason === '__missing__' ? null : reason,
      count: elements.length,
      elements,
      isBoundary: elements.every(e => e.boundary),
    }));
}

/**
 * Cluster similar reasons using simple keyword matching
 *
 * Groups reasons that share significant keywords:
 *   "needs sticky sidebar" and "sticky positioning for sidebar" → same cluster
 */
export function clusterReasons(groups) {
  const clusters = [];

  for (const group of groups) {
    if (!group.reason) {
      clusters.push({ ...group, cluster: null, keywords: [] });
      continue;
    }

    const keywords = extractKeywords(group.reason);
    let merged = false;

    for (const cluster of clusters) {
      if (!cluster.keywords.length) continue;
      const overlap = keywords.filter(k => cluster.keywords.includes(k));
      // If >50% keyword overlap, merge
      if (overlap.length >= Math.ceil(Math.min(keywords.length, cluster.keywords.length) * 0.5)) {
        cluster.count += group.count;
        cluster.elements.push(...group.elements);
        // Merge keywords
        for (const k of keywords) {
          if (!cluster.keywords.includes(k)) cluster.keywords.push(k);
        }
        merged = true;
        break;
      }
    }

    if (!merged) {
      clusters.push({
        reason: group.reason,
        count: group.count,
        elements: [...group.elements],
        isBoundary: group.isBoundary,
        cluster: group.reason,
        keywords,
      });
    }
  }

  return clusters.sort((a, b) => b.count - a.count);
}

/**
 * Extract meaningful keywords from a data-ns reason
 */
function extractKeywords(reason) {
  const stopwords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can',
    'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'this', 'that', 'these', 'those',
    'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'from',
    'and', 'or', 'but', 'not', 'no',
    'needs', 'need', 'requires', 'required', 'because', 'due',
  ]);

  return reason
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/[\s-]+/)
    .filter(w => w.length > 2 && !stopwords.has(w));
}

/**
 * Generate suggestions for new x- classes based on ns patterns
 */
export function generateSuggestions(clusters, threshold = 3) {
  const suggestions = [];

  for (const cluster of clusters) {
    if (!cluster.reason) continue;
    if (cluster.isBoundary) continue; // Don't suggest classes for third-party wrappers
    if (cluster.count < threshold) continue;

    // Generate a class name suggestion from keywords
    const name = suggestClassName(cluster.keywords);

    suggestions.push({
      reason: cluster.reason,
      count: cluster.count,
      suggestedClass: name,
      files: [...new Set(cluster.elements.map(e => e.file))],
    });
  }

  return suggestions;
}

function suggestClassName(keywords) {
  // Take the 2 most descriptive keywords
  const descriptive = keywords
    .filter(k => k.length > 3)
    .slice(0, 2);

  if (descriptive.length === 0) return 'x-custom';
  return 'x-' + descriptive.join('-');
}

// ---------------------------------------------------------------------------
// Tree-based ns visualization
// ---------------------------------------------------------------------------

/**
 * Build ns tree showing standard/ns status per element
 * Respects boundary skipping for accurate counting
 */
export function buildNsTree(scanResults, config) {
  const trees = [];

  for (const scan of scanResults) {
    if (!scan.tree || scan.error) continue;

    const fileTree = buildFileNsTree(scan.tree, config);
    if (fileTree.nsCount > 0) {
      trees.push({
        file: scan.file,
        tree: fileTree.tree,
        leafNs: fileTree.leafNs,
        boundaryNs: fileTree.boundaryNs,
        nsCount: fileTree.nsCount,
        skippedChildren: fileTree.skippedChildren,
      });
    }
  }

  return trees.sort((a, b) => b.nsCount - a.nsCount);
}

function buildFileNsTree(rootEl, config) {
  let leafNs = 0;
  let boundaryNs = 0;
  let skippedChildren = 0;

  function walkForTree(el, insideBoundary) {
    const isNs = el.hasNs;
    const isBoundary = el.nsBoundary;
    const isStandard = !isNs && el.xClasses.length > 0;
    const hasXClasses = el.xClasses.length > 0;

    let status = 'none';
    if (insideBoundary) {
      status = 'boundary-child';
      skippedChildren++;
    } else if (isBoundary) {
      status = 'boundary';
      boundaryNs++;
    } else if (isNs) {
      status = 'ns';
      leafNs++;
    } else if (hasXClasses) {
      status = 'standard';
    }

    const childInsideBoundary = insideBoundary || isBoundary;
    const children = [];
    for (const child of el.children) {
      const childNode = walkForTree(child, childInsideBoundary);
      if (childNode) children.push(childNode);
    }

    // Only include elements that are relevant (have x-classes, ns, or relevant children)
    if (status === 'none' && children.length === 0) return null;

    return {
      tag: el.tag,
      classes: el.xClasses,
      status,
      nsReason: el.nsReason,
      line: el.line,
      children,
    };
  }

  const tree = [];
  for (const child of rootEl.children) {
    const node = walkForTree(child, false);
    if (node) tree.push(node);
  }

  return {
    tree,
    leafNs,
    boundaryNs,
    nsCount: leafNs + boundaryNs,
    skippedChildren,
  };
}

/**
 * Format ns tree as printable lines
 */
export function formatNsTree(fileTree) {
  const lines = [];

  function walk(nodes, prefix) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isLast = i === nodes.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');

      const label = buildNodeLabel(node);
      lines.push(prefix + connector + label);

      if (node.status === 'boundary' && node.children.length > 0) {
        const childCount = countBoundaryChildren(node);
        lines.push(nextPrefix + `    (${childCount} internal elements — not counted)`);
      } else {
        walk(node.children, nextPrefix);
      }
    }
  }

  walk(fileTree, '');
  return lines;
}

function buildNodeLabel(node) {
  const clsStr = node.classes.length > 0 ? node.classes.join(' ') : node.tag;

  switch (node.status) {
    case 'standard':
      return `${clsStr} (standard)`;
    case 'ns':
      return `${clsStr} [data-ns="${node.nsReason || ''}"] ← LEAF NS`;
    case 'boundary':
      return `${clsStr} [data-ns="${node.nsReason || ''}"] [data-ns-boundary] ← BOUNDARY`;
    case 'boundary-child':
      return `${clsStr} (inside boundary)`;
    default:
      return `<${node.tag}> ${clsStr}`.trim();
  }
}

function countBoundaryChildren(node) {
  let count = 0;
  for (const child of node.children) {
    count++;
    count += countBoundaryChildren(child);
  }
  return count;
}

/**
 * Full audit pipeline
 */
export function audit(scanResults, config) {
  const nsElements = collectNs(scanResults);
  const groups = groupByReason(nsElements);
  const clusters = clusterReasons(groups);
  const suggestions = generateSuggestions(clusters, config?.ns?.suggestionThreshold || 3);

  // Per-file stats
  const filesWithNs = new Map();
  for (const el of nsElements) {
    filesWithNs.set(el.file, (filesWithNs.get(el.file) || 0) + 1);
  }

  const highNsFiles = [...filesWithNs.entries()]
    .filter(([, count]) => count > (config?.ns?.maxPerFile || 10))
    .sort((a, b) => b[1] - a[1]);

  return {
    total: nsElements.length,
    withReason: nsElements.filter(e => e.reason).length,
    withoutReason: nsElements.filter(e => !e.reason).length,
    boundary: nsElements.filter(e => e.boundary).length,
    groups,
    clusters,
    suggestions,
    density: scanResults.length > 0 ? (nsElements.length / scanResults.length).toFixed(2) : '0',
    highNsFiles,
    filesWithNs: filesWithNs.size,
  };
}
