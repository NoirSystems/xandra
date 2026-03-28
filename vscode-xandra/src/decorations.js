/**
 * NS Decoration Provider
 *
 * Adds visual inline decorations to ns elements:
 * - Orange dot + reason text for leaf ns
 * - Magenta dot for boundary ns
 * - Density indicators in the gutter
 */

const vscode = require('vscode');

const NS_LEAF_DECORATION = vscode.window.createTextEditorDecorationType({
  after: {
    margin: '0 0 0 1em',
    color: '#f59e0b',
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  gutterIconPath: undefined,
  overviewRulerColor: '#f59e0b',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
});

const NS_BOUNDARY_DECORATION = vscode.window.createTextEditorDecorationType({
  after: {
    margin: '0 0 0 1em',
    color: '#a855f7',
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  overviewRulerColor: '#a855f7',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
});

const NS_MISSING_REASON_DECORATION = vscode.window.createTextEditorDecorationType({
  after: {
    margin: '0 0 0 1em',
    color: '#ef4444',
    fontStyle: 'italic',
    fontWeight: 'bold',
  },
  overviewRulerColor: '#ef4444',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
});

const DENSITY_DENSE_DECORATION = vscode.window.createTextEditorDecorationType({
  after: {
    margin: '0 0 0 1em',
    color: '#818cf8',
    fontStyle: 'italic',
  },
});

const DENSITY_SPACIOUS_DECORATION = vscode.window.createTextEditorDecorationType({
  after: {
    margin: '0 0 0 1em',
    color: '#4ade80',
    fontStyle: 'italic',
  },
});

class NsDecorationProvider {
  constructor() {
    this._decorationTypes = [
      NS_LEAF_DECORATION,
      NS_BOUNDARY_DECORATION,
      NS_MISSING_REASON_DECORATION,
      DENSITY_DENSE_DECORATION,
      DENSITY_SPACIOUS_DECORATION,
    ];
  }

  update(editor) {
    const document = editor.document;
    const text = document.getText();

    const leafDecorations = [];
    const boundaryDecorations = [];
    const missingReasonDecorations = [];
    const denseDecorations = [];
    const spaciousDecorations = [];

    // Scan for ns attributes
    const nsRegex = /\bns\b(?:\s+data-ns="([^"]*)")?(?:\s+data-ns-boundary)?/g;
    let match;

    while ((match = nsRegex.exec(text)) !== null) {
      const pos = document.positionAt(match.index);
      const line = document.lineAt(pos.line);
      const range = new vscode.Range(pos, document.positionAt(match.index + match[0].length));

      const reason = match[1];
      const isBoundary = match[0].includes('data-ns-boundary');

      if (!reason && !match[0].includes('data-ns=')) {
        // ns without data-ns — error
        missingReasonDecorations.push({
          range: line.range,
          renderOptions: {
            after: { contentText: '  ← ns missing data-ns reason' },
          },
        });
      } else if (isBoundary) {
        boundaryDecorations.push({
          range: line.range,
          renderOptions: {
            after: { contentText: `  ← boundary: ${reason || '?'}` },
          },
        });
      } else {
        leafDecorations.push({
          range: line.range,
          renderOptions: {
            after: { contentText: `  ← ns: ${reason || '?'}` },
          },
        });
      }
    }

    // Scan for density classes
    const config = vscode.workspace.getConfiguration('xandra');
    if (config.get('showDensityIndicators')) {
      const denseRegex = /class="[^"]*\bx-dense\b[^"]*"/g;
      const spaciousRegex = /class="[^"]*\bx-spacious\b[^"]*"/g;

      while ((match = denseRegex.exec(text)) !== null) {
        const pos = document.positionAt(match.index);
        const line = document.lineAt(pos.line);
        denseDecorations.push({
          range: line.range,
          renderOptions: {
            after: { contentText: '  ← dense region' },
          },
        });
      }

      while ((match = spaciousRegex.exec(text)) !== null) {
        const pos = document.positionAt(match.index);
        const line = document.lineAt(pos.line);
        spaciousDecorations.push({
          range: line.range,
          renderOptions: {
            after: { contentText: '  ← spacious region' },
          },
        });
      }
    }

    editor.setDecorations(NS_LEAF_DECORATION, leafDecorations);
    editor.setDecorations(NS_BOUNDARY_DECORATION, boundaryDecorations);
    editor.setDecorations(NS_MISSING_REASON_DECORATION, missingReasonDecorations);
    editor.setDecorations(DENSITY_DENSE_DECORATION, denseDecorations);
    editor.setDecorations(DENSITY_SPACIOUS_DECORATION, spaciousDecorations);
  }

  dispose() {
    for (const type of this._decorationTypes) {
      type.dispose();
    }
  }
}

module.exports = { NsDecorationProvider };
