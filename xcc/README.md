# xcc — Xandra Contract Compiler

**TypeScript for CSS.** Validates your HTML against the Xandra design contract. Catches conflicts, tracks deviations, maps compositions, and evolves your design system from evidence.

```bash
npm install -D xandra-cc
```

```bash
npx xcc check src/        # Validate HTML against the contract
npx xcc audit              # Analyze ns deviation patterns
npx xcc audit --tree       # Tree visualization of ns propagation
npx xcc graph src/         # Map composition patterns
npx xcc promote            # Find ns patterns ready to become standards
npx xcc docs               # Generate composition documentation
npx xcc optimize           # Tree-shake unused classes from CSS
npx xcc init               # Create xandra.config.js
```

---

## Commands

### `xcc check [path]`

Validates HTML/Vue/Svelte files against 8 contract rules.

```
$ npx xcc check src/

ERRORS (2)
  src/page.html:15
    ✕ x-stack + x-row — conflicting layout modes
  src/page.html:28
    ✕ data-ns without reason — every deviation needs a reason

WARNINGS (3)
  src/page.html:42
    ⚠ Non-x- class "mt-8" on element with x- classes but no [data-ns]
  src/page.html:67
    ⚠ x-pad-3 + x-pad-5 — multiple padding values
  src/page.html:98
    ⚠ x-dense inside x-dense — inner overrides outer

SUMMARY
  12 files scanned
  5 ns elements (4 with reasons, 1 without, 1 boundary)
  2 errors, 3 warnings
```

**Validation rules:**

| # | Rule | Severity |
|---|------|----------|
| 1 | `data-ns` with empty reason | Error |
| 2 | Non-x- class mixed with x- classes without `data-ns` | Warning |
| 3 | Conflicting x- classes (e.g. `x-stack` + `x-row`) | Error |
| 4 | Redundant x- classes (e.g. `x-pad-3` + `x-pad-5`) | Warning |
| 5 | Unknown x- class not in framework | Warning |
| 6 | Invalid parent-child composition | Error/Warning |
| 7 | Double density (`x-dense` inside `x-dense`) | Warning |
| 8 | Excessive nesting depth | Warning |

**Conflict groups detected:**

- Layout direction: `x-stack`, `x-row`, `x-between`, `x-center`
- Component type: `x-card`, `x-btn`, `x-nav`, `x-input`, `x-badge`, `x-avatar`
- Type scale: `x-display`, `x-h1`-`x-h6`, `x-lead`, `x-body`, `x-small`, `x-caption`, `x-label`
- Block system: `x-block-1`, `x-block-prose`, `x-block-wide`, `x-block-full`, `x-block-2`/`3`/`4`
- Density: `x-dense`, `x-spacious`

**Options:**
- `--fail-on-error false` — exit 0 even with errors (for non-blocking CI)

---

### `xcc audit [path]`

Aggregates ns elements across the codebase. Clusters similar reasons by keyword overlap and suggests new x- classes when patterns repeat.

```
$ npx xcc audit

NS AUDIT (23 elements across 8 files)

By reason:
  7× "needs chart component"
  4× "sticky positioning for sidebar"
  3× "third-party: calendar widget" [boundary]
  2× "custom gradient background"

Suggestions:
  → "needs chart component" appears 7 times — candidate for x-chart-component
  → "sticky positioning for sidebar" appears 4 times — candidate for x-sticky-sidebar

Stats:
  ns density: 2.88 per file
  with reason: 22
  without reason: 1
  boundary: 3
```

**Options:**
- `--threshold <n>` — fail if total ns count exceeds threshold (default: 50)
- `--tree` — show tree-based ns visualization (see below)

### `xcc audit --tree`

Shows the full element tree with standard/ns status per node. Boundaries collapse their children and count as 1 ns decision.

```
$ npx xcc audit --tree

NS TREE ANALYSIS:

src/dashboard.html (4 ns decisions)
  └── x-block-1 x-stack (standard)
      ├── x-between (standard)
      │   └── div [data-ns="custom filter dropdown"] ← LEAF NS
      ├── x-block-3 (standard)
      │   ├── x-card (standard)
      │   └── div [data-ns="chart.js"] [data-ns-boundary] ← BOUNDARY
      │       (12 internal elements — not counted)
      └── footer [data-ns="sticky footer"] ← LEAF NS

  Summary: 3 leaf ns + 1 boundary ns = 4 ns decisions (12 boundary children not counted)
```

---

### `xcc graph [path]`

Builds a composition graph showing how x- classes are actually used together across the codebase.

```
$ npx xcc graph

COMPOSITION GRAPH

x-card (42 uses)
 ├─ x-stack (92% — 39/42)
 │  ├─ x-h3 (67%)
 │  ├─ x-body (78%)
 │  └─ x-row > x-btn (34%)
 ├─ <header> (56%)
 └─ <footer> (22%)

DETECTED PATTERNS

  "x-card > (x-stack + <header>)" — 39 instances

ANOMALIES

  ⚠ src/admin.html:45
    x-block-4 has 2 children but expects 4+
```

**What the graph reveals:**
- Which compositions are standard (appear consistently)
- Which patterns repeat and should be documented
- Anomalies — grids with too few children, self-nested classes, orphaned components

---

### `xcc promote [path]`

Finds ns patterns that occur frequently enough to become standard compositions. The promotion loop: **deviation -> aggregation -> suggestion -> promotion -> fewer deviations**.

```
$ npx xcc promote

PROMOTION CANDIDATES

  1. x-chart-component — needs chart component for analytics
     Found 7 times across 4 files
     Parent context: x-card
     Common children: header (100%), x-body (86%)
```

**Options:**
- `--threshold <n>` — minimum occurrences to suggest (default: 3)
- `--preview [n]` — show generated CSS for candidate n

```
$ npx xcc promote --preview 0

PREVIEW: x-chart-component

Generated CSS:
  /* needs chart component for analytics — promoted from 7 ns elements */
  .x-chart-component {
    /* Common children: header, x-body */
  }

  .x-chart-component > header {
    /* Appears in 100% of instances */
  }

Files affected:
  · src/dashboard.html
  · src/analytics.html
  · src/reports.html
  · src/overview.html
```

---

### `xcc docs [path]`

Generates an HTML composition guide from actual codebase usage.

```
$ npx xcc docs --output dist/compositions.html

COMPOSITION DOCS

  Patterns:     3
  Compositions: 87
  Slots:        2
  NS groups:    5

  Density: 3 dense, 1 spacious, 46 default

  Written to: dist/compositions.html
```

The output includes:
- Detected composition patterns with frequency
- Slot definitions (card header/footer, nav links)
- Density usage visualization
- Composition frequency table
- NS pattern summary

**Options:**
- `--output <path>` — output file (default: `dist/compositions.html`)

---

### `xcc optimize [path]`

Tree-shakes unused x- classes from the framework CSS using AST analysis.

```
$ npx xcc optimize --output dist/xandra.optimized.css

OPTIMIZE

  Original: 85 classes (24.3kb)
  Used:     52 classes
  Removed:  33 classes
  Output:   16.1kb (-34%)
```

**Options:**
- `--input <path>` — input CSS (auto-detected from framework)
- `--output <path>` — output CSS (default: `dist/xandra.optimized.css`)

---

### `xcc init`

Creates `xandra.config.js` with sensible defaults.

```
$ npx xcc init
✓ Created xandra.config.js
```

**Options:**
- `--force` — overwrite existing config

---

## Configuration

```js
/** @type {import('xcc').XandraConfig} */
export default {
  prefix: "x-",

  include: ["**/*.html", "**/*.vue", "**/*.svelte"],
  exclude: ["node_modules/**", "dist/**", ".git/**"],

  framework: {
    css: null,  // auto-detected
  },

  ns: {
    requireReason: true,
    maxPerFile: 10,
    maxTotal: 50,
    boundarySkipChildren: true,
  },

  check: {
    failOnError: true,
    failOnWarning: false,
  },

  depth: {
    warn: 6,
  },
};
```

## CI Integration

```yaml
# GitHub Actions
- name: Xandra contract check
  run: npx xcc check src/

# With audit threshold
- name: Xandra ns audit
  run: npx xcc audit --threshold 50
```

xcc exits with code 1 when errors are found, making it CI-friendly by default.

## Programmatic API

```js
import { scanFiles, check, summarize, loadConfig, Registry } from 'xcc';

const config = await loadConfig();
const registry = new Registry(config).load();
const scanResults = await scanFiles(config, 'src/');
const results = check(scanResults, registry, config);
const summary = summarize(results, scanResults);

console.log(`${summary.errors} errors, ${summary.warnings} warnings`);
```

All modules are exported: `scanFiles`, `check`, `audit`, `buildGraph`, `optimize`, `findPromotable`, `generateDocs`, `buildNsTree`, and more.

## Architecture

```
xcc/
├── bin/xcc.js         # CLI entry point
├── src/
│   ├── cli.js         # Command routing and arg parsing
│   ├── scanner.js     # HTML/Vue/Svelte parser (htmlparser2)
│   ├── registry.js    # Class intelligence (conflicts, compositions)
│   ├── checker.js     # 8 validation rules
│   ├── auditor.js     # NS aggregation, clustering, tree analysis
│   ├── grapher.js     # Composition graph, pattern/anomaly detection
│   ├── optimizer.js   # CSS tree-shaking (css-tree AST)
│   ├── promoter.js    # NS pattern → standard class promotion
│   ├── documenter.js  # HTML composition guide generation
│   ├── reporter.js    # Terminal output formatting
│   ├── colors.js      # Zero-dep ANSI colors
│   ├── config.js      # Config loading + defaults
│   └── index.js       # Programmatic API exports
└── framework/         # Copy of Xandra CSS for class extraction
```

## Dependencies

| Package | Purpose |
|---------|---------|
| htmlparser2 | HTML/Vue/Svelte parsing |
| domhandler | DOM tree construction |
| domutils | DOM traversal utilities |
| fast-glob | File discovery |
| css-tree | CSS AST for tree-shaking |

Zero runtime dependencies beyond these 5. No TypeScript, no bundler, no build step. Pure ESM.

## License

Apache 2.0
