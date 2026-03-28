/**
 * Shared utilities
 */

const vscode = require('vscode');
const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Find the xcc binary — user config, workspace node_modules, or global
 */
function findXcc(configPath) {
  if (configPath && fs.existsSync(configPath)) {
    return configPath;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      // Check workspace xcc/bin/xcc.js
      const local = path.join(folder.uri.fsPath, 'xcc', 'bin', 'xcc.js');
      if (fs.existsSync(local)) return `node ${local}`;

      // Check node_modules/.bin/xcc
      const nm = path.join(folder.uri.fsPath, 'node_modules', '.bin', 'xcc');
      if (fs.existsSync(nm)) return nm;
    }
  }

  // Check if xcc is available globally
  try {
    execSync('which xcc', { stdio: 'pipe' });
    return 'xcc';
  } catch {
    return null;
  }
}

/**
 * Run an xcc command and return stdout
 */
function runXcc(xccPath, args, cwd) {
  return new Promise((resolve, reject) => {
    if (!xccPath) {
      reject(new Error('xcc not found. Install xcc or set xandra.xccPath in settings.'));
      return;
    }

    const cmd = `${xccPath} ${args}`;
    exec(cmd, { cwd, timeout: 30000 }, (err, stdout, stderr) => {
      // xcc exits with code 1 for errors — that's expected
      resolve({ stdout: stdout || '', stderr: stderr || '', exitCode: err ? err.code : 0 });
    });
  });
}

/**
 * Get the workspace root for a document
 */
function getWorkspaceRoot(document) {
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  return folder ? folder.uri.fsPath : path.dirname(document.uri.fsPath);
}

/**
 * Check if cursor is inside a class="" attribute value
 */
function isInsideClassAttribute(document, position) {
  const lineText = document.lineAt(position.line).text;
  const beforeCursor = lineText.substring(0, position.character);

  // Find the last class=" before cursor
  const classMatch = beforeCursor.match(/class\s*=\s*"[^"]*$/);
  if (!classMatch) return false;

  // Make sure we haven't closed the quote
  const afterClassOpen = lineText.substring(beforeCursor.lastIndexOf('class'));
  const firstQuote = afterClassOpen.indexOf('"');
  const secondQuote = afterClassOpen.indexOf('"', firstQuote + 1);

  return secondQuote === -1 || position.character <= beforeCursor.lastIndexOf('"') + secondQuote;
}

/**
 * Get the word (class name) at a position
 */
function getClassAtPosition(document, position) {
  const range = document.getWordRangeAtPosition(position, /x-[\w-]+/);
  if (!range) return null;
  return document.getText(range);
}

module.exports = { findXcc, runXcc, getWorkspaceRoot, isInsideClassAttribute, getClassAtPosition };
