/**
 * Hover Provider
 *
 * Shows documentation when hovering over x- classes in HTML.
 * Displays: description, CSS preview, conflicts, and composition info.
 */

const vscode = require('vscode');
const { getClassAtPosition } = require('./utils');
const { CLASS_CATALOG } = require('./catalog');

// Build lookup map once
const CATALOG_MAP = new Map();
for (const entry of CLASS_CATALOG) {
  CATALOG_MAP.set(entry.name, entry);
}

class HoverProvider {
  provideHover(document, position) {
    const className = getClassAtPosition(document, position);
    if (!className) return null;

    const entry = CATALOG_MAP.get(className);
    if (!entry) {
      return new vscode.Hover(
        new vscode.MarkdownString(`**${className}** — Unknown x- class\n\nThis class is not part of the Xandra standard vocabulary. If intentional, consider adding to your config.`)
      );
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    // Header
    md.appendMarkdown(`### ${entry.name}\n`);
    md.appendMarkdown(`*${entry.category}*\n\n`);

    // Description
    md.appendMarkdown(`${entry.description}\n\n`);

    // CSS preview
    if (entry.css) {
      md.appendMarkdown('**CSS:**\n');
      md.appendCodeblock(entry.css, 'css');
    }

    // Conflicts
    if (entry.conflicts && entry.conflicts.length > 0) {
      md.appendMarkdown(`\n**Conflicts with:** ${entry.conflicts.map(c => `\`${c}\``).join(', ')}\n\n`);
    }

    // Suggested combinations
    if (entry.combinesWith) {
      md.appendMarkdown(`**Combines well with:** ${entry.combinesWith.map(c => `\`${c}\``).join(', ')}\n\n`);
    }

    // Context for parent-child aware classes
    const parentChildInfo = getParentChildInfo(className);
    if (parentChildInfo) {
      md.appendMarkdown(`---\n\n**Implicit child styling:**\n${parentChildInfo}\n`);
    }

    return new vscode.Hover(md);
  }
}

/**
 * Return parent-child composition info for classes that have implicit styling
 */
function getParentChildInfo(className) {
  const info = {
    'x-card': [
      '`> header` — Auto-styled card header (font-weight 600, border-bottom)',
      '`> footer` — Muted text, border-top, smaller buttons inside',
      '`> img:first-child` — Edge-to-edge media with top border radius',
      '`> p` — Body text styling with secondary color',
    ].join('\n'),
    'x-nav': [
      '`> a` — Nav links with hover state and padding',
      '`> a[aria-current="page"]` — Active link with accent color',
    ].join('\n'),
    'x-dense': [
      'Overrides `--x-space-*` tokens to tighter values.',
      'Entire subtree compacts — cards, buttons, gaps all shrink.',
      'Do not nest inside another `x-dense` or `x-spacious`.',
    ].join('\n'),
    'x-spacious': [
      'Overrides `--x-space-*` tokens to wider values.',
      'Entire subtree expands — more breathing room.',
      'Do not nest inside another `x-dense` or `x-spacious`.',
    ].join('\n'),
  };

  return info[className] || null;
}

module.exports = { HoverProvider };
