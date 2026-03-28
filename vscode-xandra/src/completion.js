/**
 * Completion Provider
 *
 * Provides autocompletion for x- classes inside class="" attributes.
 * Groups completions by category (typography, layout, spacing, etc.)
 * and provides contextual suggestions based on existing classes.
 */

const vscode = require('vscode');
const { isInsideClassAttribute } = require('./utils');
const { CLASS_CATALOG } = require('./catalog');

class CompletionProvider {
  provideCompletionItems(document, position) {
    if (!isInsideClassAttribute(document, position)) return [];

    const lineText = document.lineAt(position.line).text;
    const beforeCursor = lineText.substring(0, position.character);

    // Get existing classes on this element
    const classAttrMatch = beforeCursor.match(/class\s*=\s*"([^"]*)$/);
    const existingClasses = classAttrMatch
      ? classAttrMatch[1].split(/\s+/).filter(Boolean)
      : [];

    const items = [];

    for (const entry of CLASS_CATALOG) {
      // Skip classes already on the element
      if (existingClasses.includes(entry.name)) continue;

      // Skip conflicting classes
      if (entry.conflicts && entry.conflicts.some(c => existingClasses.includes(c))) continue;

      const item = new vscode.CompletionItem(entry.name, vscode.CompletionItemKind.Value);
      item.detail = entry.description;
      item.documentation = new vscode.MarkdownString(buildDocString(entry, existingClasses));
      item.sortText = entry.sortKey || entry.name;
      item.filterText = entry.name;

      // Add contextual boost for likely completions
      if (entry.suggestedWith && entry.suggestedWith.some(s => existingClasses.includes(s))) {
        item.sortText = '!' + entry.name; // Sort to top
        item.preselect = true;
      }

      items.push(item);
    }

    // NS attribute completions
    if (isInsideTag(beforeCursor) && !isInsideClassAttribute(document, position)) {
      items.push(...getNsSnippets());
    }

    return items;
  }
}

function buildDocString(entry, existingClasses) {
  const lines = [];

  lines.push(`**${entry.name}** — ${entry.category}`);
  lines.push('');
  lines.push(entry.description);

  if (entry.css) {
    lines.push('');
    lines.push('```css');
    lines.push(entry.css);
    lines.push('```');
  }

  if (entry.conflicts && entry.conflicts.length > 0) {
    const active = entry.conflicts.filter(c => existingClasses.includes(c));
    if (active.length > 0) {
      lines.push('');
      lines.push(`⚠️ Conflicts with: ${active.join(', ')}`);
    }
  }

  if (entry.combinesWith) {
    lines.push('');
    lines.push(`Combines with: ${entry.combinesWith.join(', ')}`);
  }

  return lines.join('\n');
}

function isInsideTag(text) {
  const lastOpen = text.lastIndexOf('<');
  const lastClose = text.lastIndexOf('>');
  return lastOpen > lastClose;
}

function getNsSnippets() {
  const nsAttr = new vscode.CompletionItem('ns data-ns=""', vscode.CompletionItemKind.Snippet);
  nsAttr.insertText = new vscode.SnippetString('ns data-ns="$1"');
  nsAttr.detail = 'Mark element as non-standard with reason';
  nsAttr.documentation = new vscode.MarkdownString(
    'The **ns** attribute marks an element as a deliberate deviation from the Xandra standard.\n\n' +
    '`data-ns` provides the reason — required by default.\n\n' +
    'Example: `ns data-ns="third-party: chart.js integration"`'
  );

  const nsBoundary = new vscode.CompletionItem('ns data-ns="" data-ns-boundary', vscode.CompletionItemKind.Snippet);
  nsBoundary.insertText = new vscode.SnippetString('ns data-ns="$1" data-ns-boundary');
  nsBoundary.detail = 'Mark subtree as non-standard boundary';
  nsBoundary.documentation = new vscode.MarkdownString(
    '**Boundary ns** — marks an entire subtree as non-standard.\n\n' +
    'Children inside a boundary are not individually counted in audits.\n\n' +
    'Use for third-party component wrappers.'
  );

  return [nsAttr, nsBoundary];
}

module.exports = { CompletionProvider };
