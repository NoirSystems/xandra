/**
 * Xandra Class Catalog
 *
 * Complete reference of all ~85 Xandra classes with metadata
 * for completion, hover, and conflict detection.
 */

const CLASS_CATALOG = [
  // -----------------------------------------------------------------------
  // Typography (13)
  // -----------------------------------------------------------------------
  { name: 'x-display', category: 'Typography', description: 'Display heading — largest type scale', css: 'font-size: clamp(2.5rem, 5vw, 4rem)', conflicts: ['x-h1','x-h2','x-h3','x-h4','x-h5','x-h6','x-lead','x-body','x-small','x-caption','x-label'], sortKey: 'a-type-00' },
  { name: 'x-h1', category: 'Typography', description: 'Heading level 1', css: 'font-size: clamp(2rem, 4vw, 3rem)', conflicts: ['x-display','x-h2','x-h3','x-h4','x-h5','x-h6','x-lead','x-body','x-small','x-caption','x-label'], sortKey: 'a-type-01' },
  { name: 'x-h2', category: 'Typography', description: 'Heading level 2', css: 'font-size: clamp(1.5rem, 3vw, 2.25rem)', conflicts: ['x-display','x-h1','x-h3','x-h4','x-h5','x-h6','x-lead','x-body','x-small','x-caption','x-label'], sortKey: 'a-type-02' },
  { name: 'x-h3', category: 'Typography', description: 'Heading level 3', css: 'font-size: clamp(1.25rem, 2.5vw, 1.75rem)', conflicts: ['x-display','x-h1','x-h2','x-h4','x-h5','x-h6','x-lead','x-body','x-small','x-caption','x-label'], sortKey: 'a-type-03' },
  { name: 'x-h4', category: 'Typography', description: 'Heading level 4', css: 'font-size: clamp(1.1rem, 2vw, 1.35rem)', conflicts: ['x-display','x-h1','x-h2','x-h3','x-h5','x-h6','x-lead','x-body','x-small','x-caption','x-label'], sortKey: 'a-type-04' },
  { name: 'x-h5', category: 'Typography', description: 'Heading level 5', css: 'font-size: 1.1rem', conflicts: ['x-display','x-h1','x-h2','x-h3','x-h4','x-h6','x-lead','x-body','x-small','x-caption','x-label'], sortKey: 'a-type-05' },
  { name: 'x-h6', category: 'Typography', description: 'Heading level 6', css: 'font-size: 1rem; text-transform: uppercase', conflicts: ['x-display','x-h1','x-h2','x-h3','x-h4','x-h5','x-lead','x-body','x-small','x-caption','x-label'], sortKey: 'a-type-06' },
  { name: 'x-lead', category: 'Typography', description: 'Lead paragraph — emphasized body text', css: 'font-size: clamp(1.1rem, 2vw, 1.25rem)', conflicts: ['x-display','x-h1','x-h2','x-h3','x-h4','x-h5','x-h6','x-body','x-small','x-caption','x-label'], sortKey: 'a-type-07' },
  { name: 'x-body', category: 'Typography', description: 'Body text — standard paragraph', css: 'font-size: 1rem; line-height: 1.6', conflicts: ['x-display','x-h1','x-h2','x-h3','x-h4','x-h5','x-h6','x-lead','x-small','x-caption','x-label'], sortKey: 'a-type-08' },
  { name: 'x-small', category: 'Typography', description: 'Small text', css: 'font-size: 0.875rem', conflicts: ['x-display','x-h1','x-h2','x-h3','x-h4','x-h5','x-h6','x-lead','x-body','x-caption','x-label'], sortKey: 'a-type-09' },
  { name: 'x-caption', category: 'Typography', description: 'Caption text — small secondary', css: 'font-size: 0.8rem; color: var(--x-text-muted)', conflicts: ['x-display','x-h1','x-h2','x-h3','x-h4','x-h5','x-h6','x-lead','x-body','x-small','x-label'], sortKey: 'a-type-10' },
  { name: 'x-label', category: 'Typography', description: 'Label text — smallest, all caps option', css: 'font-size: 0.75rem; font-weight: 500', conflicts: ['x-display','x-h1','x-h2','x-h3','x-h4','x-h5','x-h6','x-lead','x-body','x-small','x-caption'], sortKey: 'a-type-11' },
  { name: 'x-mono', category: 'Typography', description: 'Monospace font family', css: 'font-family: var(--x-font-mono)', sortKey: 'a-type-12' },

  // -----------------------------------------------------------------------
  // Layout (12)
  // -----------------------------------------------------------------------
  { name: 'x-stack', category: 'Layout', description: 'Vertical flex stack with gap', css: 'display: flex; flex-direction: column; gap: var(--x-space-3)', conflicts: ['x-row','x-between','x-center'], combinesWith: ['x-pad-*','x-gap-*','x-card'], sortKey: 'b-lay-00' },
  { name: 'x-row', category: 'Layout', description: 'Horizontal flex row with gap', css: 'display: flex; flex-direction: row; gap: var(--x-space-3); align-items: center', conflicts: ['x-stack','x-between','x-center'], combinesWith: ['x-pad-*','x-gap-*'], sortKey: 'b-lay-01' },
  { name: 'x-between', category: 'Layout', description: 'Space-between flex row', css: 'display: flex; justify-content: space-between; align-items: center', conflicts: ['x-stack','x-row','x-center'], sortKey: 'b-lay-02' },
  { name: 'x-center', category: 'Layout', description: 'Center-aligned flex container', css: 'display: flex; align-items: center; justify-content: center', conflicts: ['x-stack','x-row','x-between'], sortKey: 'b-lay-03' },
  { name: 'x-block-1', category: 'Layout', description: 'Single-column block (max-width container)', css: 'max-width: 1200px; margin: 0 auto', conflicts: ['x-block-prose','x-block-wide','x-block-full','x-block-2','x-block-3','x-block-4'], sortKey: 'b-lay-04' },
  { name: 'x-block-prose', category: 'Layout', description: 'Prose-width block (65ch)', css: 'max-width: 65ch; margin: 0 auto', conflicts: ['x-block-1','x-block-wide','x-block-full','x-block-2','x-block-3','x-block-4'], sortKey: 'b-lay-05' },
  { name: 'x-block-wide', category: 'Layout', description: 'Wide block (1400px)', css: 'max-width: 1400px; margin: 0 auto', conflicts: ['x-block-1','x-block-prose','x-block-full','x-block-2','x-block-3','x-block-4'], sortKey: 'b-lay-06' },
  { name: 'x-block-full', category: 'Layout', description: 'Full-width block', css: 'width: 100%', conflicts: ['x-block-1','x-block-prose','x-block-wide','x-block-2','x-block-3','x-block-4'], sortKey: 'b-lay-07' },
  { name: 'x-block-2', category: 'Layout', description: '2-column responsive grid', css: 'display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--x-space-4)', conflicts: ['x-block-1','x-block-prose','x-block-wide','x-block-full','x-block-3','x-block-4'], sortKey: 'b-lay-08' },
  { name: 'x-block-3', category: 'Layout', description: '3-column responsive grid', css: 'display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--x-space-4)', conflicts: ['x-block-1','x-block-prose','x-block-wide','x-block-full','x-block-2','x-block-4'], sortKey: 'b-lay-09' },
  { name: 'x-block-4', category: 'Layout', description: '4-column responsive grid', css: 'display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--x-space-4)', conflicts: ['x-block-1','x-block-prose','x-block-wide','x-block-full','x-block-2','x-block-3'], sortKey: 'b-lay-10' },
  { name: 'x-hidden', category: 'Layout', description: 'Visually hidden (display: none)', css: 'display: none', sortKey: 'b-lay-11' },
  { name: 'x-sr-only', category: 'Layout', description: 'Screen reader only (visually hidden, accessible)', css: 'position: absolute; width: 1px; height: 1px; clip: rect(0,0,0,0)', sortKey: 'b-lay-12' },

  // -----------------------------------------------------------------------
  // Spacing (20)
  // -----------------------------------------------------------------------
  ...spacingScale('pad', 'Padding on all sides'),
  ...spacingScale('gap', 'Flex/grid gap'),
  ...spacingScale('mt', 'Margin top'),
  ...spacingScale('mb', 'Margin bottom'),

  // -----------------------------------------------------------------------
  // Density (2)
  // -----------------------------------------------------------------------
  { name: 'x-dense', category: 'Density', description: 'Compact spacing — tightens all spacing tokens in subtree', css: '--x-space-1: 0.125rem; --x-space-2: 0.25rem; ...', conflicts: ['x-spacious'], combinesWith: ['x-card','x-stack','x-row'], sortKey: 'c-den-0' },
  { name: 'x-spacious', category: 'Density', description: 'Expanded spacing — widens all spacing tokens in subtree', css: '--x-space-1: 0.375rem; --x-space-2: 0.75rem; ...', conflicts: ['x-dense'], combinesWith: ['x-card','x-stack','x-row'], sortKey: 'c-den-1' },

  // -----------------------------------------------------------------------
  // Colors (18)
  // -----------------------------------------------------------------------
  { name: 'x-bg-base', category: 'Color', description: 'Base background', conflicts: ['x-bg-surface','x-bg-elevated','x-bg-primary','x-bg-success','x-bg-warning','x-bg-error'], sortKey: 'd-col-00' },
  { name: 'x-bg-surface', category: 'Color', description: 'Surface background (cards, panels)', conflicts: ['x-bg-base','x-bg-elevated','x-bg-primary','x-bg-success','x-bg-warning','x-bg-error'], sortKey: 'd-col-01' },
  { name: 'x-bg-elevated', category: 'Color', description: 'Elevated surface background', conflicts: ['x-bg-base','x-bg-surface','x-bg-primary','x-bg-success','x-bg-warning','x-bg-error'], sortKey: 'd-col-02' },
  { name: 'x-bg-primary', category: 'Color', description: 'Primary/accent background', conflicts: ['x-bg-base','x-bg-surface','x-bg-elevated','x-bg-success','x-bg-warning','x-bg-error'], sortKey: 'd-col-03' },
  { name: 'x-bg-success', category: 'Color', description: 'Success state background (muted)', sortKey: 'd-col-04' },
  { name: 'x-bg-warning', category: 'Color', description: 'Warning state background (muted)', sortKey: 'd-col-05' },
  { name: 'x-bg-error', category: 'Color', description: 'Error state background (muted)', sortKey: 'd-col-06' },
  { name: 'x-text-primary', category: 'Color', description: 'Primary text color', conflicts: ['x-text-secondary','x-text-muted','x-text-inverse','x-text-success','x-text-warning','x-text-error'], sortKey: 'd-col-07' },
  { name: 'x-text-secondary', category: 'Color', description: 'Secondary text color', conflicts: ['x-text-primary','x-text-muted','x-text-inverse','x-text-success','x-text-warning','x-text-error'], sortKey: 'd-col-08' },
  { name: 'x-text-muted', category: 'Color', description: 'Muted/dimmed text color', conflicts: ['x-text-primary','x-text-secondary','x-text-inverse','x-text-success','x-text-warning','x-text-error'], sortKey: 'd-col-09' },
  { name: 'x-text-inverse', category: 'Color', description: 'Inverse text (for dark-on-light or light-on-dark)', conflicts: ['x-text-primary','x-text-secondary','x-text-muted','x-text-success','x-text-warning','x-text-error'], sortKey: 'd-col-10' },
  { name: 'x-text-success', category: 'Color', description: 'Success state text', sortKey: 'd-col-11' },
  { name: 'x-text-warning', category: 'Color', description: 'Warning state text', sortKey: 'd-col-12' },
  { name: 'x-text-error', category: 'Color', description: 'Error state text', sortKey: 'd-col-13' },
  { name: 'x-accent', category: 'Color', description: 'Accent color (text)', sortKey: 'd-col-14' },
  { name: 'x-border', category: 'Color', description: 'Default border', sortKey: 'd-col-15' },
  { name: 'x-border-subtle', category: 'Color', description: 'Subtle border (lighter)', sortKey: 'd-col-16' },
  { name: 'x-border-strong', category: 'Color', description: 'Strong border (heavier)', sortKey: 'd-col-17' },

  // -----------------------------------------------------------------------
  // Utilities (8)
  // -----------------------------------------------------------------------
  { name: 'x-round-sm', category: 'Utility', description: 'Small border radius', conflicts: ['x-round-md','x-round-lg','x-round-full'], sortKey: 'e-util-0' },
  { name: 'x-round-md', category: 'Utility', description: 'Medium border radius', conflicts: ['x-round-sm','x-round-lg','x-round-full'], sortKey: 'e-util-1' },
  { name: 'x-round-lg', category: 'Utility', description: 'Large border radius', conflicts: ['x-round-sm','x-round-md','x-round-full'], sortKey: 'e-util-2' },
  { name: 'x-round-full', category: 'Utility', description: 'Full circle border radius', conflicts: ['x-round-sm','x-round-md','x-round-lg'], sortKey: 'e-util-3' },
  { name: 'x-shadow-sm', category: 'Utility', description: 'Small box shadow (theme-aware)', conflicts: ['x-shadow-md','x-shadow-lg'], sortKey: 'e-util-4' },
  { name: 'x-shadow-md', category: 'Utility', description: 'Medium box shadow (theme-aware)', conflicts: ['x-shadow-sm','x-shadow-lg'], sortKey: 'e-util-5' },
  { name: 'x-shadow-lg', category: 'Utility', description: 'Large box shadow (theme-aware)', conflicts: ['x-shadow-sm','x-shadow-md'], sortKey: 'e-util-6' },
  { name: 'x-overflow-auto', category: 'Utility', description: 'Overflow auto (scroll when needed)', sortKey: 'e-util-7' },

  // -----------------------------------------------------------------------
  // Components (11)
  // -----------------------------------------------------------------------
  { name: 'x-btn', category: 'Component', description: 'Primary action button', css: 'inline-flex; accent background; hover/active/focus/disabled states', conflicts: ['x-btn-ghost','x-btn-outline','x-card','x-input','x-badge','x-avatar','x-nav'], sortKey: 'f-comp-00' },
  { name: 'x-btn-ghost', category: 'Component', description: 'Transparent background button', css: 'inline-flex; transparent bg; hover reveals elevated bg', conflicts: ['x-btn','x-btn-outline','x-card','x-input','x-badge','x-avatar','x-nav'], sortKey: 'f-comp-01' },
  { name: 'x-btn-outline', category: 'Component', description: 'Border button (outlined)', css: 'inline-flex; transparent bg; border; hover elevates', conflicts: ['x-btn','x-btn-ghost','x-card','x-input','x-badge','x-avatar','x-nav'], sortKey: 'f-comp-02' },
  { name: 'x-card', category: 'Component', description: 'Card container — auto-styles header, footer, img children', css: 'container-query; adaptive padding; surface bg; shadow', conflicts: ['x-btn','x-btn-ghost','x-btn-outline','x-input','x-badge','x-avatar','x-nav'], combinesWith: ['x-stack','x-dense','x-spacious','x-pad-*'], sortKey: 'f-comp-03' },
  { name: 'x-nav', category: 'Component', description: 'Navigation container — auto-styles direct <a> children', css: 'flex row; links get hover/active states; aria-current support', conflicts: ['x-btn','x-btn-ghost','x-btn-outline','x-card','x-input','x-badge','x-avatar'], sortKey: 'f-comp-04' },
  { name: 'x-input', category: 'Component', description: 'Form input field', css: 'block; full-width; focus ring; HTML5 validation states', conflicts: ['x-btn','x-btn-ghost','x-btn-outline','x-card','x-badge','x-avatar','x-nav'], sortKey: 'f-comp-05' },
  { name: 'x-badge', category: 'Component', description: 'Inline label/tag', css: 'inline-flex; pill shape; elevated bg', conflicts: ['x-btn','x-btn-ghost','x-btn-outline','x-card','x-input','x-avatar','x-nav'], sortKey: 'f-comp-06' },
  { name: 'x-avatar', category: 'Component', description: 'User/profile image container', css: 'circle; fluid size via clamp; image cover', conflicts: ['x-btn','x-btn-ghost','x-btn-outline','x-card','x-input','x-badge','x-nav'], sortKey: 'f-comp-07' },
  { name: 'x-link', category: 'Component', description: 'Styled anchor with underline', css: 'accent color; underline offset; focus ring', sortKey: 'f-comp-08' },
  { name: 'x-divider', category: 'Component', description: 'Horizontal separator', css: '1px height; subtle border color', sortKey: 'f-comp-09' },
  { name: 'x-code', category: 'Component', description: 'Inline code span', css: 'mono font; accent bg/color; small padding', sortKey: 'f-comp-10' },
  { name: 'x-pre', category: 'Component', description: 'Code block', css: 'mono font; base bg; border; horizontal scroll', sortKey: 'f-comp-11' },

  // -----------------------------------------------------------------------
  // Themes (4)
  // -----------------------------------------------------------------------
  { name: 'x-theme-dark', category: 'Theme', description: 'Dark theme (default)', conflicts: ['x-theme-light','x-theme-nvg','x-theme-high-contrast'], sortKey: 'g-theme-0' },
  { name: 'x-theme-light', category: 'Theme', description: 'Light theme', conflicts: ['x-theme-dark','x-theme-nvg','x-theme-high-contrast'], sortKey: 'g-theme-1' },
  { name: 'x-theme-nvg', category: 'Theme', description: 'Night vision green theme', conflicts: ['x-theme-dark','x-theme-light','x-theme-high-contrast'], sortKey: 'g-theme-2' },
  { name: 'x-theme-high-contrast', category: 'Theme', description: 'High contrast accessibility theme', conflicts: ['x-theme-dark','x-theme-light','x-theme-nvg'], sortKey: 'g-theme-3' },

  // -----------------------------------------------------------------------
  // Audit (1)
  // -----------------------------------------------------------------------
  { name: 'x-audit', category: 'Debug', description: 'Enable visual NS audit mode — shows indicators on ns elements', sortKey: 'z-audit' },
];

function spacingScale(prefix, desc) {
  const group = `x-${prefix}`;
  return [1, 2, 3, 4, 5, 6].map(n => ({
    name: `${group}-${n}`,
    category: 'Spacing',
    description: `${desc} level ${n} (var(--x-space-${n}))`,
    conflicts: [1, 2, 3, 4, 5, 6].filter(m => m !== n).map(m => `${group}-${m}`),
    sortKey: `c-spc-${prefix}-${n}`,
  }));
}

module.exports = { CLASS_CATALOG };
