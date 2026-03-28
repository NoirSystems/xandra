/**
 * CSS Optimizer
 *
 * Tree-shakes unused x- classes from the framework CSS.
 * Scans HTML for used classes, then removes unused rules.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import * as csstree from 'css-tree';

/**
 * Collect all x- classes used across scan results
 */
export function collectUsedClasses(scanResults) {
  const used = new Set();

  for (const scan of scanResults) {
    for (const el of scan.elements) {
      for (const cls of el.xClasses) {
        used.add(cls);
      }
    }
  }

  // Always keep audit system classes
  used.add('x-audit');

  return used;
}

/**
 * Parse CSS and remove rules whose selectors reference unused x- classes
 */
export function optimizeCSS(cssSource, usedClasses) {
  const ast = csstree.parse(cssSource, { positions: true });

  // Track which rules to remove
  const toRemove = [];

  csstree.walk(ast, {
    enter(node) {
      if (node.type === 'Rule') {
        if (shouldRemoveRule(node, usedClasses)) {
          toRemove.push(node);
        }
      }
    },
  });

  // Remove marked rules
  for (const node of toRemove) {
    const parent = node.parent;
    if (parent && parent.children) {
      parent.children.remove(node);
    }
  }

  return csstree.generate(ast);
}

function shouldRemoveRule(rule, usedClasses) {
  if (!rule.prelude || rule.prelude.type !== 'SelectorList') return false;

  // Check each selector in the selector list
  const selectors = rule.prelude.children;
  let allUnused = true;

  selectors.forEach(selector => {
    const classes = extractXClasses(selector);

    // If no x- classes in this selector, keep the rule (it's a reset, variable, etc.)
    if (classes.length === 0) {
      allUnused = false;
      return;
    }

    // If any x- class in the selector is used, keep it
    for (const cls of classes) {
      if (usedClasses.has(cls)) {
        allUnused = false;
        return;
      }
    }
  });

  return allUnused;
}

function extractXClasses(selectorNode) {
  const classes = [];

  csstree.walk(selectorNode, {
    enter(node) {
      if (node.type === 'ClassSelector' && node.name.startsWith('x-')) {
        classes.push(node.name);
      }
    },
  });

  return classes;
}

/**
 * Full optimize pipeline
 */
export function optimize(scanResults, cssInputPath, cssOutputPath) {
  const usedClasses = collectUsedClasses(scanResults);
  const cssSource = readFileSync(cssInputPath, 'utf-8');

  // Count original classes
  const originalClasses = new Set();
  const classRegex = /\.(x-[\w][\w-]*)/g;
  let m;
  while ((m = classRegex.exec(cssSource)) !== null) {
    originalClasses.add(m[1]);
  }

  const optimized = optimizeCSS(cssSource, usedClasses);

  if (cssOutputPath) {
    writeFileSync(cssOutputPath, optimized, 'utf-8');
  }

  return {
    originalSize: Buffer.byteLength(cssSource, 'utf-8'),
    optimizedSize: Buffer.byteLength(optimized, 'utf-8'),
    originalClasses: originalClasses.size,
    usedClasses: usedClasses.size,
    removedClasses: originalClasses.size - usedClasses.size,
    savings: Math.round((1 - Buffer.byteLength(optimized, 'utf-8') / Buffer.byteLength(cssSource, 'utf-8')) * 100),
    output: optimized,
  };
}
