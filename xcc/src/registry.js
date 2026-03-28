/**
 * Xandra Class Registry
 *
 * Knows every valid x- class, which classes conflict, which compositions
 * are standard, suspicious, or invalid. The "intelligence" of the compiler.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// 1. Extract known classes from framework CSS
// ---------------------------------------------------------------------------

export function extractClassesFromCSS(cssPath) {
  if (!existsSync(cssPath)) return new Set();
  const css = readFileSync(cssPath, 'utf-8');
  const classes = new Set();
  // Match .x-something but not inside comments or pseudo-selectors that happen to match
  const regex = /\.(x-[\w][\w-]*)/g;
  let m;
  while ((m = regex.exec(css)) !== null) {
    classes.add(m[1]);
  }
  return classes;
}

export function findFrameworkCSS(config) {
  // 1. Explicit config
  if (config?.framework?.css && existsSync(config.framework.css)) {
    return config.framework.css;
  }

  const cwd = process.cwd();

  // 2. Local xcc/framework copy
  const local = resolve(__dirname, '..', 'framework', 'dist', 'xandra.css');
  if (existsSync(local)) return local;

  // 3. node_modules
  const nm = resolve(cwd, 'node_modules', 'xandra', 'dist', 'xandra.css');
  if (existsSync(nm)) return nm;

  // 4. Sibling dist/
  const sibling = resolve(cwd, 'dist', 'xandra.css');
  if (existsSync(sibling)) return sibling;

  return null;
}

// ---------------------------------------------------------------------------
// 2. Conflict groups — classes in the same group are mutually exclusive
// ---------------------------------------------------------------------------

export const CONFLICT_GROUPS = [
  {
    name: 'layout-direction',
    classes: ['x-stack', 'x-row', 'x-between', 'x-center'],
    severity: 'error',
    reason: 'conflicting layout modes — each sets display and direction differently',
  },
  {
    name: 'component-type',
    classes: ['x-card', 'x-btn', 'x-btn-ghost', 'x-btn-outline', 'x-input', 'x-badge', 'x-avatar', 'x-nav'],
    severity: 'error',
    reason: 'conflicting component types — an element can only be one component',
  },
  {
    name: 'type-scale',
    classes: ['x-display', 'x-h1', 'x-h2', 'x-h3', 'x-h4', 'x-h5', 'x-h6', 'x-lead', 'x-body', 'x-small', 'x-caption', 'x-label'],
    severity: 'error',
    reason: 'conflicting type scales — only one typography class per element',
  },
  {
    name: 'block-system',
    classes: ['x-block-1', 'x-block-prose', 'x-block-wide', 'x-block-full', 'x-block-2', 'x-block-3', 'x-block-4'],
    severity: 'error',
    reason: 'conflicting block containers — each defines a different layout constraint',
  },
  {
    name: 'density',
    classes: ['x-dense', 'x-spacious'],
    severity: 'error',
    reason: 'conflicting density modifiers — an element cannot be both dense and spacious',
  },
];

// ---------------------------------------------------------------------------
// 3. Redundancy groups — same property, different values (last wins)
// ---------------------------------------------------------------------------

export const REDUNDANCY_GROUPS = [
  { name: 'padding', classes: ['x-pad-1', 'x-pad-2', 'x-pad-3', 'x-pad-4', 'x-pad-5', 'x-pad-6'] },
  { name: 'gap', classes: ['x-gap-1', 'x-gap-2', 'x-gap-3', 'x-gap-4', 'x-gap-5', 'x-gap-6'] },
  { name: 'margin-top', classes: ['x-mt-1', 'x-mt-2', 'x-mt-3', 'x-mt-4', 'x-mt-5', 'x-mt-6'] },
  { name: 'margin-bottom', classes: ['x-mb-1', 'x-mb-2', 'x-mb-3', 'x-mb-4', 'x-mb-5', 'x-mb-6'] },
  { name: 'border-radius', classes: ['x-round-sm', 'x-round-md', 'x-round-lg', 'x-round-full'] },
  { name: 'box-shadow', classes: ['x-shadow-sm', 'x-shadow-md', 'x-shadow-lg'] },
  { name: 'background-color', classes: ['x-bg-base', 'x-bg-surface', 'x-bg-elevated', 'x-bg-primary', 'x-bg-success', 'x-bg-warning', 'x-bg-error'] },
  { name: 'text-color', classes: ['x-text-primary', 'x-text-secondary', 'x-text-muted', 'x-text-inverse', 'x-text-success', 'x-text-warning', 'x-text-error'] },
];

// ---------------------------------------------------------------------------
// 4. Composition contracts — parent > child relationships
// ---------------------------------------------------------------------------

export const COMPOSITIONS = {
  // Known-good: these are standard patterns
  valid: new Set([
    'x-card > x-stack',
    'x-card > x-row',
    'x-card > x-between',
    'x-block-1 > x-stack',
    'x-block-1 > x-block-2',
    'x-block-1 > x-block-3',
    'x-block-1 > x-block-4',
    'x-block-2 > x-card',
    'x-block-3 > x-card',
    'x-block-4 > x-card',
    'x-between > x-row',
    'x-row > x-btn',
    'x-row > x-btn-ghost',
    'x-row > x-btn-outline',
    'x-row > x-badge',
    'x-row > x-link',
    'x-stack > x-card',
    'x-stack > x-divider',
    'x-stack > x-between',
    'x-stack > x-row',
    'x-stack > x-block-2',
    'x-stack > x-block-3',
    'x-stack > x-block-4',
  ]),

  // Suspicious: warn and suggest ns if intentional
  suspicious: [
    { test: (p, c) => isBlock(p) && isBlock(c), reason: 'nested grids — add [ns] if this is intentional' },
    { test: (p, c) => p === 'x-card' && c === 'x-card', reason: 'nested cards — unusual, add [ns] if intentional' },
    { test: (p, c) => isBtn(p), reason: 'button should contain text/icon only, not nested components' },
  ],

  // Invalid: always an error
  invalid: [
    { test: (p, c) => isBtn(p) && isBtn(c), reason: 'nested buttons are never valid HTML or UX' },
  ],
};

function isBlock(cls) {
  return cls && cls.startsWith('x-block-');
}

function isBtn(cls) {
  return cls === 'x-btn' || cls === 'x-btn-ghost' || cls === 'x-btn-outline';
}

// ---------------------------------------------------------------------------
// 5. Combinability — which classes make sense together on one element
// ---------------------------------------------------------------------------

// Classes that CAN be combined with layout classes
const COMBINABLE_WITH_LAYOUT = new Set([
  'x-pad-1', 'x-pad-2', 'x-pad-3', 'x-pad-4', 'x-pad-5', 'x-pad-6',
  'x-gap-1', 'x-gap-2', 'x-gap-3', 'x-gap-4', 'x-gap-5', 'x-gap-6',
  'x-mt-1', 'x-mt-2', 'x-mt-3', 'x-mt-4', 'x-mt-5', 'x-mt-6',
  'x-mb-1', 'x-mb-2', 'x-mb-3', 'x-mb-4', 'x-mb-5', 'x-mb-6',
  'x-bg-base', 'x-bg-surface', 'x-bg-elevated', 'x-bg-primary',
  'x-bg-success', 'x-bg-warning', 'x-bg-error',
  'x-border', 'x-border-subtle', 'x-border-strong',
  'x-round-sm', 'x-round-md', 'x-round-lg', 'x-round-full',
  'x-shadow-sm', 'x-shadow-md', 'x-shadow-lg',
  'x-overflow-auto',
  'x-hidden',
]);

// ---------------------------------------------------------------------------
// 6. Registry class — the main export
// ---------------------------------------------------------------------------

export class Registry {
  constructor(config) {
    this.config = config;
    this.prefix = config?.prefix || 'x-';
    this.knownClasses = new Set();
    this._loaded = false;
  }

  load() {
    if (this._loaded) return this;
    const cssPath = findFrameworkCSS(this.config);
    if (cssPath) {
      this.knownClasses = extractClassesFromCSS(cssPath);
    } else {
      // Fallback: hardcoded core set
      this.knownClasses = CORE_CLASSES;
    }
    this._loaded = true;
    return this;
  }

  isXandraClass(cls) {
    return cls.startsWith(this.prefix);
  }

  isKnownClass(cls) {
    return this.knownClasses.has(cls);
  }

  isUnknownXClass(cls) {
    return this.isXandraClass(cls) && !this.isKnownClass(cls);
  }

  /** Returns conflict errors for a set of classes on one element */
  findConflicts(classes) {
    const xClasses = classes.filter(c => this.isXandraClass(c));
    const results = [];

    for (const group of CONFLICT_GROUPS) {
      const groupSet = group._set || (group._set = new Set(group.classes));
      const matches = xClasses.filter(c => groupSet.has(c));
      if (matches.length > 1) {
        results.push({
          severity: group.severity,
          code: 'CONFLICT',
          group: group.name,
          classes: matches,
          reason: group.reason,
        });
      }
    }

    return results;
  }

  /** Returns redundancy warnings for a set of classes on one element */
  findRedundancies(classes) {
    const xClasses = classes.filter(c => this.isXandraClass(c));
    const results = [];

    for (const group of REDUNDANCY_GROUPS) {
      const groupSet = group._set || (group._set = new Set(group.classes));
      const matches = xClasses.filter(c => groupSet.has(c));
      if (matches.length > 1) {
        results.push({
          severity: 'warning',
          code: 'REDUNDANT',
          group: group.name,
          classes: matches,
          reason: `multiple ${group.name} values — last in source order wins, others are wasted`,
        });
      }
    }

    return results;
  }

  /** Check parent-child composition */
  checkComposition(parentXClass, childXClass) {
    const key = `${parentXClass} > ${childXClass}`;

    // Check invalid first
    for (const rule of COMPOSITIONS.invalid) {
      if (rule.test(parentXClass, childXClass)) {
        return { severity: 'error', code: 'INVALID_COMPOSITION', reason: rule.reason };
      }
    }

    // Check suspicious
    for (const rule of COMPOSITIONS.suspicious) {
      if (rule.test(parentXClass, childXClass)) {
        return { severity: 'warning', code: 'SUSPICIOUS_COMPOSITION', reason: rule.reason };
      }
    }

    // Known valid — no issue
    if (COMPOSITIONS.valid.has(key)) {
      return null;
    }

    // Unknown composition — not flagged (we only flag suspicious/invalid)
    return null;
  }
}

// Hardcoded fallback if no framework CSS found
const CORE_CLASSES = new Set([
  'x-display', 'x-h1', 'x-h2', 'x-h3', 'x-h4', 'x-h5', 'x-h6',
  'x-lead', 'x-body', 'x-small', 'x-caption', 'x-label', 'x-mono',
  'x-stack', 'x-row', 'x-between', 'x-center',
  'x-block-1', 'x-block-prose', 'x-block-wide', 'x-block-full',
  'x-block-2', 'x-block-3', 'x-block-4',
  'x-hidden', 'x-sr-only',
  'x-pad-1', 'x-pad-2', 'x-pad-3', 'x-pad-4', 'x-pad-5', 'x-pad-6',
  'x-gap-1', 'x-gap-2', 'x-gap-3', 'x-gap-4', 'x-gap-5', 'x-gap-6',
  'x-mt-1', 'x-mt-2', 'x-mt-3', 'x-mt-4', 'x-mt-5', 'x-mt-6',
  'x-mb-1', 'x-mb-2', 'x-mb-3', 'x-mb-4', 'x-mb-5', 'x-mb-6',
  'x-bg-base', 'x-bg-surface', 'x-bg-elevated', 'x-bg-primary',
  'x-bg-success', 'x-bg-warning', 'x-bg-error',
  'x-text-primary', 'x-text-secondary', 'x-text-muted', 'x-text-inverse',
  'x-text-success', 'x-text-warning', 'x-text-error',
  'x-accent', 'x-border', 'x-border-subtle', 'x-border-strong',
  'x-round-sm', 'x-round-md', 'x-round-lg', 'x-round-full',
  'x-shadow-sm', 'x-shadow-md', 'x-shadow-lg',
  'x-overflow-auto',
  'x-btn', 'x-btn-ghost', 'x-btn-outline',
  'x-card', 'x-input', 'x-badge', 'x-avatar',
  'x-link', 'x-divider', 'x-code', 'x-pre',
  'x-theme-dark', 'x-theme-light', 'x-theme-nvg', 'x-theme-high-contrast',
  'x-audit',
  'x-dense', 'x-spacious',
  'x-nav',
]);
