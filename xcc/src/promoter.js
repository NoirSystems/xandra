/**
 * Composition Promoter
 *
 * Finds repeated ns patterns that can be promoted to standard compositions.
 * Generates CSS for new classes based on actual codebase usage.
 *
 * The promotion loop:
 *   deviation → aggregation → suggestion → promotion → fewer deviations
 */

import { collectNs, clusterReasons } from './auditor.js';

/**
 * Find promotable ns patterns
 *
 * A pattern is promotable when:
 * - It appears in multiple files (threshold count)
 * - It has a consistent data-ns reason (clustered)
 * - It is NOT a boundary (third-party wrappers stay as ns)
 */
export function findPromotable(scanResults, config, threshold = 3) {
  const nsElements = collectNs(scanResults);
  const groups = groupByReasonForPromotion(nsElements);
  const clusters = clusterReasons(groups);

  const candidates = [];
  for (const cluster of clusters) {
    if (!cluster.reason) continue;
    if (cluster.isBoundary) continue;
    if (cluster.count < threshold) continue;

    // Analyze the common structure of elements in this cluster
    const structure = analyzeCommonStructure(cluster.elements, scanResults);

    candidates.push({
      reason: cluster.reason,
      count: cluster.count,
      files: [...new Set(cluster.elements.map(e => e.file))],
      suggestedName: suggestName(cluster.keywords || extractKeywordsFromReason(cluster.reason)),
      structure,
      elements: cluster.elements,
    });
  }

  return candidates.sort((a, b) => b.count - a.count);
}

function groupByReasonForPromotion(nsElements) {
  const groups = new Map();

  for (const el of nsElements) {
    const key = el.reason || '__missing__';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(el);
  }

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
 * Analyze the common HTML structure across cluster elements
 */
function analyzeCommonStructure(clusterElements, scanResults) {
  // Build a map of file → scan result for quick lookup
  const scanMap = new Map();
  for (const scan of scanResults) {
    scanMap.set(scan.file, scan);
  }

  const structures = [];
  for (const nsEl of clusterElements) {
    const scan = scanMap.get(nsEl.file);
    if (!scan) continue;

    // Find the matching element in the scan tree
    const match = findElementByLine(scan.elements, nsEl.line);
    if (!match) continue;

    structures.push({
      parentClasses: nsEl.parentXClasses,
      ownClasses: nsEl.xClasses,
      childTags: match.children.map(c => ({
        tag: c.tag,
        xClasses: c.xClasses,
      })),
    });
  }

  // Find common parent context
  const parentCounts = new Map();
  for (const s of structures) {
    for (const cls of s.parentClasses) {
      parentCounts.set(cls, (parentCounts.get(cls) || 0) + 1);
    }
  }

  const commonParents = [...parentCounts.entries()]
    .filter(([, count]) => count >= structures.length * 0.5)
    .map(([cls]) => cls);

  // Find common child patterns
  const childCounts = new Map();
  for (const s of structures) {
    for (const child of s.childTags) {
      const key = child.xClasses.length > 0 ? child.xClasses[0] : child.tag;
      childCounts.set(key, (childCounts.get(key) || 0) + 1);
    }
  }

  const commonChildren = [...childCounts.entries()]
    .filter(([, count]) => count >= structures.length * 0.5)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      name: key,
      frequency: Math.round((count / structures.length) * 100),
    }));

  return {
    sampleCount: structures.length,
    commonParents,
    commonChildren,
  };
}

function findElementByLine(elements, line) {
  return elements.find(e => e.line === line) || null;
}

/**
 * Generate CSS for a promoted composition
 */
export function generatePromotionCSS(candidate) {
  const name = candidate.suggestedName;
  const lines = [];

  lines.push(`/* ${candidate.reason} — promoted from ${candidate.count} ns elements */`);
  lines.push(`.${name} {`);

  // If commonly inside a card, inherit card-like properties
  if (candidate.structure.commonParents.includes('x-card')) {
    lines.push(`  /* Extends card context */`);
  }

  lines.push(`  /* TODO: Add specific styles based on the pattern */`);
  lines.push(`  /* Common children: ${candidate.structure.commonChildren.map(c => c.name).join(', ')} */`);
  lines.push(`}`);
  lines.push('');

  // Generate child rules if there are common children
  for (const child of candidate.structure.commonChildren) {
    if (child.name.startsWith('x-') || child.name === 'img' || child.name === 'header' || child.name === 'footer') {
      const childSel = child.name.startsWith('x-') ? `.${child.name}` :
        child.name.startsWith('<') ? child.name.slice(1, -1) : child.name;
      lines.push(`.${name} > ${childSel} {`);
      lines.push(`  /* Appears in ${child.frequency}% of instances */`);
      lines.push(`}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format a promotion preview for terminal output
 */
export function formatPromotionPreview(candidate) {
  const lines = [];

  lines.push(`Pattern: "${candidate.reason}"`);
  lines.push(`Found: ${candidate.count} times across ${candidate.files.length} files`);
  lines.push(`Suggested class: ${candidate.suggestedName}`);
  lines.push('');

  if (candidate.structure.commonParents.length > 0) {
    lines.push(`Common parent context: ${candidate.structure.commonParents.join(', ')}`);
  }

  if (candidate.structure.commonChildren.length > 0) {
    lines.push('Common children:');
    for (const child of candidate.structure.commonChildren) {
      lines.push(`  · ${child.name} (${child.frequency}% of instances)`);
    }
  }

  lines.push('');
  lines.push('Files affected:');
  for (const file of candidate.files) {
    lines.push(`  · ${file}`);
  }

  return lines;
}

function suggestName(keywords) {
  const descriptive = keywords.filter(k => k.length > 3).slice(0, 2);
  if (descriptive.length === 0) return 'x-custom';
  return 'x-' + descriptive.join('-');
}

function extractKeywordsFromReason(reason) {
  const stopwords = new Set([
    'a', 'an', 'the', 'is', 'are', 'needs', 'need', 'requires',
    'for', 'with', 'on', 'at', 'by', 'from', 'and', 'or', 'but',
    'not', 'no', 'this', 'that', 'of', 'in', 'to',
  ]);

  return reason
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/[\s-]+/)
    .filter(w => w.length > 2 && !stopwords.has(w));
}
