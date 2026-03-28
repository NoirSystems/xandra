/**
 * Reporter
 *
 * Formats and prints results to the terminal.
 * Handles check results, audit reports, composition graphs, and optimizer stats.
 */

import { relative } from 'node:path';
import { bold, dim, red, green, yellow, blue, cyan, gray, magenta } from './colors.js';

const cwd = process.cwd();

function relPath(file) {
  return relative(cwd, file);
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function header() {
  console.log(bold(cyan('xcc')) + dim(' v1.1.0 — Xandra Contract Compiler'));
  console.log('');
}

// ---------------------------------------------------------------------------
// Check report
// ---------------------------------------------------------------------------

export function reportCheck(results, summary) {
  const errors = results.filter(r => r.severity === 'error');
  const warnings = results.filter(r => r.severity === 'warning');

  if (errors.length > 0) {
    console.log(bold(red(`ERRORS (${errors.length})`)));
    for (const r of errors) {
      const loc = r.line > 0 ? `:${r.line}` : '';
      console.log(`  ${dim(relPath(r.file) + loc)}`);
      console.log(`    ${red('✕')} ${r.message}`);
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log(bold(yellow(`WARNINGS (${warnings.length})`)));
    for (const r of warnings) {
      const loc = r.line > 0 ? `:${r.line}` : '';
      console.log(`  ${dim(relPath(r.file) + loc)}`);
      console.log(`    ${yellow('⚠')} ${r.message}`);
    }
    console.log('');
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log(bold(green('✓ No issues found')));
    console.log('');
  }

  // Summary
  console.log(bold('SUMMARY'));
  console.log(`  ${summary.totalFiles} files scanned`);

  if (summary.parseErrors > 0) {
    console.log(`  ${yellow(summary.parseErrors + '')} files could not be parsed`);
  }

  if (summary.nsTotal > 0) {
    console.log(`  ${summary.nsTotal} ns elements (${summary.nsWithReason} with reasons, ${summary.nsWithoutReason} without, ${summary.nsBoundary} boundary)`);
  }

  const errorStr = summary.errors > 0 ? red(`${summary.errors} errors`) : green('0 errors');
  const warnStr = summary.warnings > 0 ? yellow(`${summary.warnings} warnings`) : green('0 warnings');
  console.log(`  ${errorStr}, ${warnStr}`);
  console.log('');

  if (summary.exitCode === 0) {
    console.log(green('Exit code: 0 (clean)'));
  } else {
    console.log(red('Exit code: 1 (errors found)'));
  }
}

// ---------------------------------------------------------------------------
// Audit report
// ---------------------------------------------------------------------------

export function reportAudit(auditResult) {
  console.log(bold(`NS AUDIT`) + dim(` (${auditResult.total} elements across ${auditResult.filesWithNs} files)`));
  console.log('');

  if (auditResult.total === 0) {
    console.log(green('  No ns elements found — fully standard codebase!'));
    console.log('');
    return;
  }

  // By reason
  console.log(bold('By reason:'));
  for (const group of auditResult.groups) {
    const count = yellow(`${group.count}×`);
    if (!group.reason) {
      console.log(`  ${count} ${red('[missing reason — ERROR]')}`);
    } else {
      const boundary = group.isBoundary ? dim(' [boundary]') : '';
      console.log(`  ${count} "${group.reason}"${boundary}`);
    }
  }
  console.log('');

  // Clustered suggestions
  if (auditResult.suggestions.length > 0) {
    console.log(bold('Suggestions:'));
    for (const s of auditResult.suggestions) {
      console.log(`  ${cyan('→')} "${s.reason}" appears ${bold(s.count + '')} times — candidate for ${green(s.suggestedClass)}`);
    }
    console.log('');
  }

  // High-ns files
  if (auditResult.highNsFiles.length > 0) {
    console.log(bold(yellow('High ns-density files:')));
    for (const [file, count] of auditResult.highNsFiles) {
      console.log(`  ${relPath(file)}: ${yellow(count + '')} ns elements`);
    }
    console.log('');
  }

  // Stats
  console.log(bold('Stats:'));
  console.log(`  ns density: ${auditResult.density} per file`);
  console.log(`  with reason: ${green(auditResult.withReason + '')}`);
  console.log(`  without reason: ${auditResult.withoutReason > 0 ? red(auditResult.withoutReason + '') : green('0')}`);
  console.log(`  boundary: ${auditResult.boundary}`);
}

// ---------------------------------------------------------------------------
// Audit tree report
// ---------------------------------------------------------------------------

export function reportAuditTree(nsTrees, formatNsTreeFn) {
  console.log(bold('NS TREE ANALYSIS'));
  console.log('');

  if (nsTrees.length === 0) {
    console.log(green('  No ns elements found — fully standard codebase!'));
    console.log('');
    return;
  }

  for (const fileData of nsTrees) {
    const path = relPath(fileData.file);
    console.log(bold(cyan(path)) + dim(` (${fileData.nsCount} ns decisions)`));
    const lines = formatNsTreeFn(fileData.tree);
    for (const line of lines) {
      // Colorize based on content
      if (line.includes('← LEAF NS')) {
        console.log(`  ${yellow(line)}`);
      } else if (line.includes('← BOUNDARY')) {
        console.log(`  ${magenta(line)}`);
      } else if (line.includes('not counted')) {
        console.log(`  ${dim(line)}`);
      } else if (line.includes('(standard)')) {
        console.log(`  ${green(line)}`);
      } else {
        console.log(`  ${line}`);
      }
    }
    console.log('');
    console.log(dim(`  Summary: ${fileData.leafNs} leaf ns + ${fileData.boundaryNs} boundary ns = ${fileData.nsCount} ns decisions`) +
      (fileData.skippedChildren > 0 ? dim(` (${fileData.skippedChildren} boundary children not counted)`) : ''));
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// Graph report
// ---------------------------------------------------------------------------

export function reportGraph(graph, patterns, anomalies) {
  // Composition tree
  console.log(bold('COMPOSITION GRAPH'));
  console.log('');

  const sorted = [...graph.entries()]
    .filter(([, n]) => n.count >= 2)
    .sort((a, b) => b[1].count - a[1].count);

  if (sorted.length === 0) {
    console.log(dim('  No compositions found (need x- classes in HTML files)'));
    console.log('');
    return;
  }

  for (const [cls, node] of sorted) {
    console.log(bold(cyan(cls)) + dim(` (${node.count} uses)`));
    printNodeChildren(node, ' ', 3, 1, 10);
    console.log('');
  }

  // Patterns
  if (patterns.length > 0) {
    console.log(bold('DETECTED PATTERNS'));
    console.log('');
    for (const p of patterns) {
      console.log(`  ${green('"' + p.signature + '"')} — ${p.parentCount} instances`);
      for (const child of p.children) {
        console.log(`    ${dim('·')} ${child.name} (${child.percent}%)`);
        for (const sub of child.subChildren || []) {
          console.log(`      ${dim('·')} ${sub.name} (${sub.percent}%)`);
        }
      }
    }
    console.log('');
  }

  // Anomalies
  if (anomalies.length > 0) {
    console.log(bold(yellow('ANOMALIES')));
    console.log('');
    for (const a of anomalies) {
      const loc = a.line > 0 ? `:${a.line}` : '';
      console.log(`  ${yellow('⚠')} ${relPath(a.file)}${loc}`);
      console.log(`    ${a.message}`);
    }
    console.log('');
  }
}

function printNodeChildren(node, prefix, maxDepth, currentDepth, minPercent) {
  if (currentDepth > maxDepth) return;

  const children = [...node.children.entries()]
    .filter(([, c]) => c.percent >= minPercent)
    .sort((a, b) => b[1].percent - a[1].percent);

  for (let i = 0; i < children.length; i++) {
    const [name, child] = children[i];
    const isLast = i === children.length - 1;
    const connector = isLast ? '└─' : '├─';
    const nextPrefix = prefix + (isLast ? '  ' : '│ ');

    const nameStr = name.startsWith('x-') ? cyan(name) : magenta(name);
    console.log(`${prefix}${connector} ${nameStr} ${dim(`(${child.percent}% — ${child.count}/${node.count})`)}`);
    printNodeChildren(child, nextPrefix, maxDepth, currentDepth + 1, minPercent);
  }
}

// ---------------------------------------------------------------------------
// Optimize report
// ---------------------------------------------------------------------------

export function reportOptimize(result, outputPath) {
  console.log(bold('OPTIMIZE'));
  console.log('');

  const origKb = (result.originalSize / 1024).toFixed(1);
  const optKb = (result.optimizedSize / 1024).toFixed(1);

  console.log(`  Original: ${result.originalClasses} classes (${origKb}kb)`);
  console.log(`  Used:     ${green(result.usedClasses + '')} classes`);
  console.log(`  Removed:  ${result.removedClasses > 0 ? yellow(result.removedClasses + '') : '0'} classes`);
  console.log(`  Output:   ${optKb}kb ${green(`(-${result.savings}%)`)}`);

  if (outputPath) {
    console.log('');
    console.log(`  Written to: ${green(relPath(outputPath))}`);
  }
}

// ---------------------------------------------------------------------------
// Init report
// ---------------------------------------------------------------------------

export function reportInit(configPath) {
  console.log(bold(green('✓')) + ` Created ${relPath(configPath)}`);
  console.log('');
  console.log('  Next steps:');
  console.log(`  1. Edit ${cyan('xandra.config.js')} to match your project`);
  console.log(`  2. Run ${cyan('xcc check')} to validate your HTML`);
  console.log(`  3. Run ${cyan('xcc audit')} to analyze ns patterns`);
  console.log(`  4. Run ${cyan('xcc graph')} to see composition patterns`);
}

// ---------------------------------------------------------------------------
// Promote report
// ---------------------------------------------------------------------------

export function reportPromote(candidates) {
  console.log(bold('PROMOTION CANDIDATES'));
  console.log('');

  if (candidates.length === 0) {
    console.log(dim('  No promotable patterns found. Need repeated ns patterns (3+ occurrences).'));
    console.log('');
    return;
  }

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    console.log(`  ${bold(cyan(`${i + 1}. ${c.suggestedName}`))} — ${c.reason}`);
    console.log(`     Found ${yellow(c.count + '')} times across ${c.files.length} files`);

    if (c.structure.commonParents.length > 0) {
      console.log(`     Parent context: ${c.structure.commonParents.join(', ')}`);
    }

    if (c.structure.commonChildren.length > 0) {
      console.log(`     Common children: ${c.structure.commonChildren.map(ch => `${ch.name} (${ch.frequency}%)`).join(', ')}`);
    }

    console.log('');
  }
}

export function reportPromotePreview(candidate, css) {
  console.log(bold('PREVIEW: ') + cyan(candidate.suggestedName));
  console.log('');
  console.log(dim('Generated CSS:'));
  for (const line of css.split('\n')) {
    console.log(`  ${line}`);
  }
  console.log('');
  console.log(bold('Files affected:'));
  for (const file of candidate.files) {
    console.log(`  ${dim('·')} ${relPath(file)}`);
  }
  console.log('');
  console.log(dim(`Run with --apply to write CSS (not yet implemented — review and add manually)`));
}

// ---------------------------------------------------------------------------
// Docs report
// ---------------------------------------------------------------------------

export function reportDocs(docsData, outputPath) {
  console.log(bold('COMPOSITION DOCS'));
  console.log('');
  console.log(`  Patterns:     ${cyan(docsData.totalPatterns + '')}`);
  console.log(`  Compositions: ${cyan(docsData.totalCompositions + '')}`);
  console.log(`  Slots:        ${cyan(docsData.slots.length + '')}`);
  console.log(`  NS groups:    ${cyan(docsData.nsGroups.length + '')}`);
  console.log('');

  if (docsData.densityUsage.dense > 0 || docsData.densityUsage.spacious > 0) {
    console.log(`  Density: ${docsData.densityUsage.dense} dense, ${docsData.densityUsage.spacious} spacious, ${docsData.densityUsage.default} default`);
    console.log('');
  }

  if (outputPath) {
    console.log(`  Written to: ${green(relPath(outputPath))}`);
  }
}

// ---------------------------------------------------------------------------
// Scanning progress
// ---------------------------------------------------------------------------

export function reportScanning(count) {
  console.log(dim(`Scanning ${count} files...`));
  console.log('');
}
