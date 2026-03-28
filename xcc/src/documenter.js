/**
 * Composition Documenter
 *
 * Auto-generates a composition guide from the actual codebase.
 * Shows patterns, slot definitions, density variants, and ns patterns.
 */

import { writeFileSync } from 'node:fs';
import { buildGraph, detectPatterns } from './grapher.js';
import { collectNs, groupByReason } from './auditor.js';

/**
 * Generate documentation data from scan results
 */
export function generateDocs(scanResults, config) {
  const graph = buildGraph(scanResults);
  const patterns = detectPatterns(graph);
  const nsElements = collectNs(scanResults);
  const nsGroups = groupByReason(nsElements);

  // Extract slot definitions from implicit child styling
  const slots = extractSlotDefinitions(graph);

  // Density usage analysis
  const densityUsage = analyzeDensityUsage(scanResults);

  // Composition frequency table
  const compositions = buildCompositionTable(graph);

  return {
    patterns,
    slots,
    densityUsage,
    compositions,
    nsGroups,
    totalFiles: scanResults.length,
    totalCompositions: compositions.length,
    totalPatterns: patterns.length,
  };
}

/**
 * Extract slot definitions — parent classes that use implicit child styling
 */
function extractSlotDefinitions(graph) {
  const slotParents = ['x-card', 'x-nav'];
  const slots = [];

  for (const parent of slotParents) {
    const node = graph.get(parent);
    if (!node) continue;

    const childSlots = [];
    for (const [childName, childNode] of node.children) {
      // Include both x-classes and semantic tags
      childSlots.push({
        name: childName,
        count: childNode.count,
        percent: childNode.percent,
        type: childName.startsWith('<') ? 'semantic' : 'class',
      });
    }

    if (childSlots.length > 0) {
      slots.push({
        parent,
        count: node.count,
        slots: childSlots.sort((a, b) => b.percent - a.percent),
      });
    }
  }

  return slots;
}

/**
 * Analyze density class usage across the codebase
 */
function analyzeDensityUsage(scanResults) {
  let denseCount = 0;
  let spaciousCount = 0;
  let defaultCount = 0;
  const denseFiles = new Set();
  const spaciousFiles = new Set();

  for (const scan of scanResults) {
    for (const el of scan.elements) {
      if (el.xClasses.includes('x-dense')) {
        denseCount++;
        denseFiles.add(scan.file);
      }
      if (el.xClasses.includes('x-spacious')) {
        spaciousCount++;
        spaciousFiles.add(scan.file);
      }
      if (el.xClasses.length > 0 && !el.xClasses.includes('x-dense') && !el.xClasses.includes('x-spacious')) {
        defaultCount++;
      }
    }
  }

  return {
    dense: denseCount,
    spacious: spaciousCount,
    default: defaultCount,
    denseFiles: [...denseFiles],
    spaciousFiles: [...spaciousFiles],
  };
}

/**
 * Build a frequency table of all parent > child compositions
 */
function buildCompositionTable(graph) {
  const table = [];

  for (const [parentCls, node] of graph) {
    for (const [childName, childNode] of node.children) {
      table.push({
        parent: parentCls,
        child: childName,
        count: childNode.count,
        percent: childNode.percent,
      });
    }
  }

  return table.sort((a, b) => b.count - a.count);
}

/**
 * Generate HTML documentation
 */
export function generateHTML(docsData) {
  const { patterns, slots, densityUsage, compositions, nsGroups, totalFiles, totalCompositions, totalPatterns } = docsData;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xandra Composition Guide</title>
  <style>
    :root {
      --bg: #0a0a0f; --surface: #12121a; --text: #e4e4e7; --muted: #71717a;
      --accent: #818cf8; --border: #27272a; --green: #4ade80; --yellow: #facc15;
      --red: #f87171; --mono: 'SF Mono', 'Fira Code', monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 2rem; max-width: 960px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.4rem; margin: 2rem 0 1rem; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    h3 { font-size: 1.1rem; margin: 1rem 0 0.5rem; }
    .meta { color: var(--muted); margin-bottom: 2rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .count { font-family: var(--mono); font-size: 0.9rem; color: var(--accent); }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.8rem; }
    .badge-standard { background: #166534; color: var(--green); }
    .badge-ns { background: #713f12; color: var(--yellow); }
    .badge-semantic { background: #1e1b4b; color: var(--accent); }
    .pattern { background: var(--surface); border: 1px solid var(--border); border-radius: 0.5rem; padding: 1rem; margin: 0.75rem 0; }
    .pattern-sig { font-family: var(--mono); font-size: 0.9rem; color: var(--accent); }
    .tree { font-family: var(--mono); font-size: 0.85rem; padding: 0.5rem 0; }
    .tree-line { padding: 0.1rem 0; }
    .density-bar { display: flex; height: 1.5rem; border-radius: 0.25rem; overflow: hidden; margin: 0.5rem 0; }
    .density-bar > div { display: flex; align-items: center; justify-content: center; font-size: 0.75rem; }
    .density-dense { background: var(--accent); color: var(--bg); }
    .density-default { background: var(--border); color: var(--text); }
    .density-spacious { background: var(--green); color: var(--bg); }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>Xandra Composition Guide</h1>
  <p class="meta">Generated by xcc from ${totalFiles} files &middot; ${totalCompositions} compositions &middot; ${totalPatterns} patterns</p>

  <h2>Detected Patterns</h2>
  ${patterns.length === 0 ? '<p>No composition patterns detected yet.</p>' : patterns.map(p => `
  <div class="pattern">
    <div class="pattern-sig">${escapeHtml(p.signature)}</div>
    <div>Found ${p.parentCount} times</div>
    <div class="tree">
      ${p.children.map(c => `<div class="tree-line">├─ ${escapeHtml(c.name)} <span class="count">${c.percent}%</span></div>
        ${(c.subChildren || []).map(sc => `<div class="tree-line">&nbsp;&nbsp;└─ ${escapeHtml(sc.name)} <span class="count">${sc.percent}%</span></div>`).join('\n')}`).join('\n')}
    </div>
  </div>`).join('\n')}

  <h2>Slot Definitions</h2>
  ${slots.length === 0 ? '<p>No slot definitions found.</p>' : slots.map(s => `
  <h3>${escapeHtml(s.parent)} <span class="count">(${s.count} uses)</span></h3>
  <table>
    <tr><th>Child</th><th>Type</th><th>Frequency</th></tr>
    ${s.slots.map(sl => `<tr>
      <td>${escapeHtml(sl.name)}</td>
      <td><span class="badge ${sl.type === 'semantic' ? 'badge-semantic' : 'badge-standard'}">${sl.type}</span></td>
      <td class="count">${sl.percent}% (${sl.count}×)</td>
    </tr>`).join('\n')}
  </table>`).join('\n')}

  <h2>Density Usage</h2>
  ${(() => {
    const total = densityUsage.dense + densityUsage.spacious + densityUsage.default;
    if (total === 0) return '<p>No x- class usage found.</p>';
    const dp = Math.round((densityUsage.dense / total) * 100);
    const sp = Math.round((densityUsage.spacious / total) * 100);
    const def = 100 - dp - sp;
    return `<div class="density-bar">
      ${dp > 0 ? `<div class="density-dense" style="width:${dp}%">dense ${dp}%</div>` : ''}
      <div class="density-default" style="width:${def}%">default ${def}%</div>
      ${sp > 0 ? `<div class="density-spacious" style="width:${sp}%">spacious ${sp}%</div>` : ''}
    </div>
    <p>${densityUsage.dense} x-dense regions, ${densityUsage.spacious} x-spacious regions, ${densityUsage.default} default</p>`;
  })()}

  <h2>Composition Frequency</h2>
  <table>
    <tr><th>Parent</th><th>Child</th><th>Count</th><th>%</th></tr>
    ${compositions.slice(0, 30).map(c => `<tr>
      <td>${escapeHtml(c.parent)}</td>
      <td>${escapeHtml(c.child)}</td>
      <td class="count">${c.count}</td>
      <td class="count">${c.percent}%</td>
    </tr>`).join('\n')}
  </table>

  <h2>NS Patterns</h2>
  ${nsGroups.length === 0 ? '<p>No ns elements — fully standard codebase!</p>' : `
  <table>
    <tr><th>Reason</th><th>Count</th><th>Type</th></tr>
    ${nsGroups.map(g => `<tr>
      <td>${g.reason ? escapeHtml(g.reason) : '<em>missing reason</em>'}</td>
      <td class="count">${g.count}</td>
      <td><span class="badge ${g.isBoundary ? 'badge-ns' : 'badge-standard'}">${g.isBoundary ? 'boundary' : 'deviation'}</span></td>
    </tr>`).join('\n')}
  </table>`}

  <footer>
    Generated by <strong>xcc</strong> — Xandra Contract Compiler
  </footer>
</body>
</html>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Write docs to file
 */
export function writeDocs(html, outputPath) {
  writeFileSync(outputPath, html, 'utf-8');
}
