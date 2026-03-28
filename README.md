# Xandra

**A standardization contract for consistent UI.**

Xandra is not a utility framework. It is a design contract — ~85 classes that encode layout, typography, color, and component decisions. Everything outside the standard is tracked, audited, and eventually promoted back into it.

```bash
npm install xandra
```

```html
<article class="x-card">
  <header>User Profile</header>
  <p>Bio information here.</p>
  <footer>Last seen: today</footer>
</article>
```

One class. Semantic HTML does the rest. The card knows what `<header>`, `<footer>`, and `<img>` mean in its context.

---

## Why Xandra

| | Tailwind | Component libraries | Xandra |
|---|---|---|---|
| Philosophy | 500 properties, compose yourself | 50 components, pick a variant | 85 standards, deviations tracked |
| Responsive | Viewport breakpoints | Props/variants | Container queries, self-responsive |
| Size variants | `btn-sm`, `btn-lg`, `btn-xs`... | `size="sm"`, `size="lg"` | `x-dense` on parent, subtree adapts |
| Validation | None | Runtime prop checks | `xcc check` at build time |
| JavaScript | Required (JIT, runtime) | Required (React, Vue, etc.) | Zero |
| Evolution | You decide what to add | Library decides | Codebase evidence promotes patterns |

## Quick Start

### 1. Install the framework

```bash
npm install xandra
```

```js
import 'xandra';
```

Or link the CSS directly:

```html
<link rel="stylesheet" href="node_modules/xandra/dist/xandra.css">
```

### 2. Install the compiler (optional but recommended)

```bash
npm install -D xcc
npx xcc init
npx xcc check src/
```

### 3. Install the VSCode extension (optional)

Search "Xandra CSS" in the VSCode marketplace, or install from the `vscode-xandra/` directory.

---

## The ~85 Classes

Xandra's entire vocabulary. You learn these once, then build anything.

### Typography (13)

| Class | Purpose |
|-------|---------|
| `x-display` | Hero/display text (fluid: 2.5rem - 4rem) |
| `x-h1` - `x-h6` | Heading scale (fluid via clamp) |
| `x-lead` | Emphasized intro paragraph |
| `x-body` | Standard body text |
| `x-small` | Small text |
| `x-caption` | Captions, metadata |
| `x-label` | Labels, smallest text |
| `x-mono` | Monospace font |

### Layout (12)

| Class | Purpose |
|-------|---------|
| `x-stack` | Vertical flex column with gap |
| `x-row` | Horizontal flex row with gap |
| `x-between` | Space-between row (responsive) |
| `x-center` | Centered flex container |
| `x-block-1` | Single-column container (1200px) |
| `x-block-prose` | Prose-width container (65ch) |
| `x-block-wide` | Wide container (1400px) |
| `x-block-full` | Full-width container |
| `x-block-2` / `3` / `4` | Responsive 2/3/4-column grid |
| `x-hidden` | Display none |
| `x-sr-only` | Screen reader only |

### Spacing (20)

| Class | Purpose |
|-------|---------|
| `x-pad-1` - `x-pad-6` | Padding (all sides) scale 1-6 |
| `x-gap-1` - `x-gap-6` | Flex/grid gap scale 1-6 |
| `x-mt-1` - `x-mt-6` | Margin top scale 1-6 |
| `x-mb-1` - `x-mb-6` | Margin bottom scale 1-6 |

### Density (2)

| Class | Purpose |
|-------|---------|
| `x-dense` | Compact spacing for entire subtree |
| `x-spacious` | Expanded spacing for entire subtree |

Put `x-dense` on a parent. Every card, button, gap, and padding inside it shrinks. No size variants needed.

```html
<aside class="x-card x-stack x-dense">
  <h4 class="x-h4">Sidebar</h4>
  <p class="x-body">Everything compact.</p>
  <button class="x-btn">Save</button>
</aside>
```

### Color (18)

| Class | Purpose |
|-------|---------|
| `x-bg-base` / `surface` / `elevated` / `primary` | Background layers |
| `x-bg-success` / `warning` / `error` | State backgrounds (muted) |
| `x-text-primary` / `secondary` / `muted` / `inverse` | Text colors |
| `x-text-success` / `warning` / `error` | State text |
| `x-accent` | Accent color |
| `x-border` / `border-subtle` / `border-strong` | Border colors |

### Components (12)

| Class | Purpose |
|-------|---------|
| `x-btn` | Primary button (hover, active, focus, disabled) |
| `x-btn-ghost` | Transparent button |
| `x-btn-outline` | Bordered button |
| `x-card` | Card container (adaptive padding, implicit child styling) |
| `x-nav` | Navigation container (auto-styles `<a>` children) |
| `x-input` | Form input (HTML5 validation states) |
| `x-badge` | Inline label/tag (auto-sizes icons) |
| `x-avatar` | Profile image (fluid via clamp) |
| `x-link` | Styled anchor |
| `x-divider` | Horizontal separator |
| `x-code` | Inline code |
| `x-pre` | Code block |

### Utilities (8)

`x-round-sm` `x-round-md` `x-round-lg` `x-round-full`
`x-shadow-sm` `x-shadow-md` `x-shadow-lg`
`x-overflow-auto`

### Themes (4)

`x-theme-dark` (default) `x-theme-light` `x-theme-nvg` `x-theme-high-contrast`

Apply to `<html>` or any container. Themes cascade — you can nest them.

---

## Implicit Child Styling

Xandra classes understand their children. This is the key difference from utility frameworks.

### Cards know their slots

```html
<article class="x-card">
  <img src="hero.jpg" alt="">      <!-- edge-to-edge, rounded top -->
  <header>Title</header>            <!-- bold, border-bottom, spacing -->
  <p>Description text.</p>          <!-- body styling, secondary color -->
  <footer>                          <!-- muted, border-top, spacing -->
    <button class="x-btn">Save</button>  <!-- auto-smaller in footer -->
  </footer>
</article>
```

Zero classes on children. The card styles them by context.

### Navigation knows its links

```html
<nav class="x-nav">
  <a href="/" aria-current="page">Home</a>   <!-- accent + bg highlight -->
  <a href="/about">About</a>                  <!-- hover state -->
  <a href="/settings">Settings</a>
</nav>
```

Active state via `aria-current` — no `.active` class needed.

### Badges scale in headings

```html
<h2 class="x-h2">Active Users <span class="x-badge">Live</span></h2>
```

The badge auto-scales to 0.4em of the heading.

---

## The NS System

When you need something outside the ~85 standard classes, you mark it:

```html
<!-- Standard: no marker needed -->
<div class="x-card x-stack">...</div>

<!-- Non-standard: requires ns + reason -->
<div class="x-card" ns data-ns="needs sticky positioning for sidebar">
  ...
</div>

<!-- Third-party boundary: children not individually counted -->
<div ns data-ns="chart.js integration" data-ns-boundary>
  <canvas id="chart"></canvas>
</div>
```

**Rules:**
- `ns` marks an element as a deliberate deviation
- `data-ns="reason"` is required — every deviation needs justification
- `data-ns-boundary` marks an entire subtree (third-party components)
- `x-audit` on `<html>` enables visual audit mode (CSS-only, no JS)

**The loop:** deviation → audit → pattern detection → promotion → new standard class → fewer deviations.

---

## Responsive Design

Xandra uses **container queries** and **fluid values** instead of viewport breakpoints.

```css
/* Cards adapt to their container, not the viewport */
@container (min-width: 400px) {
  .x-card { padding: var(--x-space-5); }
}

/* Typography scales fluidly */
.x-h1 { font-size: clamp(2rem, 4vw, 3rem); }

/* Grids collapse based on container width */
@container (max-width: 600px) {
  .x-block-2 { grid-template-columns: 1fr; }
}
```

Components are self-responsive. No `sm:` / `md:` / `lg:` prefixes.

---

## Design Tokens

All Xandra classes reference CSS custom properties. Override them to customize:

```css
:root {
  --x-space-1: 0.25rem;    /* through --x-space-8 */
  --x-radius-sm: 0.25rem;  /* sm, md, lg, full */
  --x-font-sans: system-ui, sans-serif;
  --x-font-mono: 'Fira Code', monospace;
  --x-transition-fast: 100ms ease;
  --x-transition-normal: 200ms ease;
}
```

The density system works by locally overriding these tokens:

```css
.x-dense {
  --x-space-1: 0.125rem;
  --x-space-2: 0.25rem;
  /* ... */
}
```

---

## Ecosystem

| Package | Purpose | Install |
|---------|---------|---------|
| [`xandra`](.) | CSS framework (~85 classes) | `npm install xandra` |
| [`xcc`](./xcc) | Contract compiler (7 commands) | `npm install -D xcc` |
| [`vscode-xandra`](./vscode-xandra) | VSCode extension | Marketplace / local install |

---

## Project Structure

```
xandra/
├── src/                    # Framework source (11 CSS files)
│   ├── xandra.css          # Entry point
│   ├── _reset.css          # Minimal reset
│   ├── _tokens.css         # Design tokens (spacing, type, radius)
│   ├── _themes.css         # 4 themes (dark, light, nvg, high-contrast)
│   ├── _typography.css     # 13 type classes
│   ├── _layout.css         # 12 layout classes (container-query responsive)
│   ├── _spacing.css        # 20 spacing + density system
│   ├── _colors.css         # 18 color classes
│   ├── _utilities.css      # 8 utility classes
│   ├── _components.css     # 12 components + implicit child styling
│   └── _ns-audit.css       # NS audit visualization
├── dist/                   # Built CSS
├── xcc/                    # Compiler (see xcc/README.md)
└── vscode-xandra/          # VSCode extension (see vscode-xandra/README.md)
```

## License

Apache 2.0
