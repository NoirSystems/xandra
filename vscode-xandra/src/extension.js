/**
 * Xandra CSS — VSCode Extension
 *
 * Provides:
 * - Diagnostics from xcc check (inline errors/warnings)
 * - Class autocompletion for x- classes
 * - Hover documentation for x- classes
 * - NS attribute snippets and validation
 * - Density/composition awareness
 * - Inline decorations for ns elements
 * - Commands for audit, graph, promote, docs
 */

const vscode = require('vscode');
const { DiagnosticsProvider } = require('./diagnostics');
const { CompletionProvider } = require('./completion');
const { HoverProvider } = require('./hover');
const { NsDecorationProvider } = require('./decorations');
const { registerCommands } = require('./commands');
const { findXcc } = require('./utils');

let diagnosticsProvider;
let nsDecorations;

function activate(context) {
  const config = vscode.workspace.getConfiguration('xandra');
  if (!config.get('enable')) return;

  const xccPath = findXcc(config.get('xccPath'));

  // --- Diagnostics (xcc check) ---
  diagnosticsProvider = new DiagnosticsProvider(xccPath);
  context.subscriptions.push(diagnosticsProvider);

  if (config.get('validateOnSave')) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(doc => {
        if (isXandraFile(doc)) {
          diagnosticsProvider.validate(doc);
        }
      })
    );
  }

  if (config.get('validateOnType')) {
    let debounceTimer;
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(e => {
        if (isXandraFile(e.document)) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            diagnosticsProvider.validate(e.document);
          }, 800);
        }
      })
    );
  }

  // Validate open files on activation
  for (const editor of vscode.window.visibleTextEditors) {
    if (isXandraFile(editor.document)) {
      diagnosticsProvider.validate(editor.document);
    }
  }

  // --- Class Completion ---
  const completionProvider = new CompletionProvider();
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider('html', completionProvider, '"', ' ', 'x'),
    vscode.languages.registerCompletionItemProvider('vue', completionProvider, '"', ' ', 'x'),
    vscode.languages.registerCompletionItemProvider('svelte', completionProvider, '"', ' ', 'x'),
  );

  // --- Hover Documentation ---
  const hoverProvider = new HoverProvider();
  context.subscriptions.push(
    vscode.languages.registerHoverProvider('html', hoverProvider),
    vscode.languages.registerHoverProvider('vue', hoverProvider),
    vscode.languages.registerHoverProvider('svelte', hoverProvider),
  );

  // --- NS Decorations ---
  if (config.get('showNsDecorations')) {
    nsDecorations = new NsDecorationProvider();
    context.subscriptions.push(nsDecorations);

    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && isXandraFile(editor.document)) {
          nsDecorations.update(editor);
        }
      }),
      vscode.workspace.onDidChangeTextDocument(e => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === e.document && isXandraFile(e.document)) {
          nsDecorations.update(editor);
        }
      })
    );

    // Decorate active editor on activation
    if (vscode.window.activeTextEditor && isXandraFile(vscode.window.activeTextEditor.document)) {
      nsDecorations.update(vscode.window.activeTextEditor);
    }
  }

  // --- Commands ---
  registerCommands(context, xccPath);

  // Status bar
  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.text = '$(shield) Xandra';
  statusItem.tooltip = 'Xandra CSS contract active';
  statusItem.command = 'xandra.check';
  statusItem.show();
  context.subscriptions.push(statusItem);
}

function deactivate() {
  if (diagnosticsProvider) {
    diagnosticsProvider.dispose();
  }
}

function isXandraFile(document) {
  const lang = document.languageId;
  return lang === 'html' || lang === 'vue' || lang === 'svelte';
}

module.exports = { activate, deactivate };
