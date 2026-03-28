/**
 * Diagnostics Provider
 *
 * Runs xcc check on files and converts results to VSCode diagnostics.
 * Surfaces errors/warnings inline in the editor.
 */

const vscode = require('vscode');
const { runXcc, getWorkspaceRoot } = require('./utils');

// Map xcc result codes to VSCode severity
const SEVERITY_MAP = {
  error: vscode.DiagnosticSeverity.Error,
  warning: vscode.DiagnosticSeverity.Warning,
  info: vscode.DiagnosticSeverity.Information,
};

// Map xcc codes to readable source names
const CODE_LABELS = {
  NS_NO_REASON: 'ns-missing-reason',
  UNMARKED_NON_STANDARD: 'unmarked-non-standard',
  CONFLICT: 'class-conflict',
  REDUNDANT: 'redundant-class',
  UNKNOWN_CLASS: 'unknown-class',
  INVALID_COMPOSITION: 'invalid-composition',
  SUSPICIOUS_COMPOSITION: 'suspicious-composition',
  DEEP_NESTING: 'deep-nesting',
  DOUBLE_DENSITY: 'double-density',
  PARSE_ERROR: 'parse-error',
};

class DiagnosticsProvider {
  constructor(xccPath) {
    this.xccPath = xccPath;
    this.collection = vscode.languages.createDiagnosticCollection('xandra');
    this._pending = new Map();
  }

  async validate(document) {
    if (!this.xccPath) return;

    const filePath = document.uri.fsPath;
    const cwd = getWorkspaceRoot(document);

    // Cancel any pending validation for this file
    if (this._pending.has(filePath)) {
      this._pending.get(filePath).cancel = true;
    }

    const token = { cancel: false };
    this._pending.set(filePath, token);

    try {
      const result = await runXcc(this.xccPath, `check "${filePath}" --fail-on-error false`, cwd);
      if (token.cancel) return;

      const diagnostics = parseXccOutput(result.stdout, filePath, document);
      this.collection.set(document.uri, diagnostics);
    } catch (err) {
      // Silent fail — don't spam user with xcc errors
      console.error('xandra: validation failed', err.message);
    } finally {
      this._pending.delete(filePath);
    }
  }

  clear(document) {
    this.collection.delete(document.uri);
  }

  dispose() {
    this.collection.dispose();
  }
}

/**
 * Parse xcc terminal output into diagnostics
 *
 * xcc output format:
 *   file:line
 *     ✕ message  (errors)
 *     ⚠ message  (warnings)
 */
function parseXccOutput(output, filePath, document) {
  const diagnostics = [];
  const lines = output.split('\n');

  let currentSeverity = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect section headers
    if (line.startsWith('ERRORS')) {
      currentSeverity = vscode.DiagnosticSeverity.Error;
      continue;
    }
    if (line.startsWith('WARNINGS')) {
      currentSeverity = vscode.DiagnosticSeverity.Warning;
      continue;
    }
    if (line.startsWith('SUMMARY') || line.startsWith('✓')) {
      break;
    }

    // Match error/warning lines: ✕ message or ⚠ message
    const errorMatch = line.match(/^[✕✗×]\s+(.+)$/);
    const warnMatch = line.match(/^⚠\s+(.+)$/);

    if (errorMatch || warnMatch) {
      const message = (errorMatch || warnMatch)[1];
      const severity = errorMatch
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Warning;

      // Look back for the file:line location
      const locLine = lines[i - 1]?.trim() || '';
      const locMatch = locLine.match(/:(\d+)$/);
      const lineNum = locMatch ? parseInt(locMatch[1]) - 1 : 0;

      // Try to find the relevant range in the document
      const range = findRelevantRange(document, lineNum, message);

      const diagnostic = new vscode.Diagnostic(range, message, severity);
      diagnostic.source = 'xandra';
      diagnostic.code = inferCode(message);

      diagnostics.push(diagnostic);
    }
  }

  return diagnostics;
}

/**
 * Find a relevant range to underline for a given diagnostic
 */
function findRelevantRange(document, lineNum, message) {
  const safeLine = Math.min(lineNum, document.lineCount - 1);
  const lineText = document.lineAt(safeLine).text;

  // Try to find class names mentioned in the message
  const classMatch = message.match(/x-[\w-]+/g);
  if (classMatch) {
    for (const cls of classMatch) {
      const idx = lineText.indexOf(cls);
      if (idx !== -1) {
        return new vscode.Range(safeLine, idx, safeLine, idx + cls.length);
      }
    }
  }

  // Try to find ns attribute
  if (message.includes('[ns]') || message.includes('data-ns')) {
    const nsIdx = lineText.indexOf(' ns');
    if (nsIdx !== -1) {
      return new vscode.Range(safeLine, nsIdx, safeLine, nsIdx + 3);
    }
  }

  // Fall back to the whole line
  const start = lineText.search(/\S/);
  return new vscode.Range(safeLine, Math.max(0, start), safeLine, lineText.length);
}

/**
 * Infer a diagnostic code from the message
 */
function inferCode(message) {
  if (message.includes('[ns] without data-ns')) return CODE_LABELS.NS_NO_REASON;
  if (message.includes('Non-x- class')) return CODE_LABELS.UNMARKED_NON_STANDARD;
  if (message.includes('conflicting')) return CODE_LABELS.CONFLICT;
  if (message.includes('multiple') && message.includes('values')) return CODE_LABELS.REDUNDANT;
  if (message.includes('Unknown x- class')) return CODE_LABELS.UNKNOWN_CLASS;
  if (message.includes('nested buttons')) return CODE_LABELS.INVALID_COMPOSITION;
  if (message.includes('unusual') || message.includes('suspicious')) return CODE_LABELS.SUSPICIOUS_COMPOSITION;
  if (message.includes('nesting depth')) return CODE_LABELS.DEEP_NESTING;
  if (message.includes('double density') || message.includes('inside x-dense') || message.includes('inside x-spacious')) return CODE_LABELS.DOUBLE_DENSITY;
  return 'xandra';
}

module.exports = { DiagnosticsProvider };
