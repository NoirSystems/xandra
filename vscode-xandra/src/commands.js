/**
 * Command registrations
 *
 * Maps xandra.* commands to xcc CLI invocations.
 * Results are shown in an output channel or webview panel.
 */

const vscode = require('vscode');
const { runXcc, getWorkspaceRoot } = require('./utils');

let outputChannel;

function getOutputChannel() {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Xandra');
  }
  return outputChannel;
}

function registerCommands(context, xccPath) {
  // Check current file
  context.subscriptions.push(
    vscode.commands.registerCommand('xandra.check', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active file to check');
        return;
      }

      const cwd = getWorkspaceRoot(editor.document);
      const filePath = editor.document.uri.fsPath;
      const channel = getOutputChannel();

      channel.clear();
      channel.show(true);
      channel.appendLine('Running xcc check...\n');

      const result = await runXcc(xccPath, `check "${filePath}"`, cwd);
      channel.appendLine(stripAnsi(result.stdout));
      if (result.stderr) channel.appendLine(result.stderr);
    })
  );

  // Audit ns patterns
  context.subscriptions.push(
    vscode.commands.registerCommand('xandra.audit', async () => {
      const cwd = getWorkspaceCwd();
      if (!cwd) return;

      const channel = getOutputChannel();
      channel.clear();
      channel.show(true);
      channel.appendLine('Running xcc audit...\n');

      const result = await runXcc(xccPath, 'audit', cwd);
      channel.appendLine(stripAnsi(result.stdout));
    })
  );

  // Audit ns tree
  context.subscriptions.push(
    vscode.commands.registerCommand('xandra.auditTree', async () => {
      const cwd = getWorkspaceCwd();
      if (!cwd) return;

      const channel = getOutputChannel();
      channel.clear();
      channel.show(true);
      channel.appendLine('Running xcc audit --tree...\n');

      const result = await runXcc(xccPath, 'audit --tree', cwd);
      channel.appendLine(stripAnsi(result.stdout));
    })
  );

  // Composition graph
  context.subscriptions.push(
    vscode.commands.registerCommand('xandra.graph', async () => {
      const cwd = getWorkspaceCwd();
      if (!cwd) return;

      const channel = getOutputChannel();
      channel.clear();
      channel.show(true);
      channel.appendLine('Running xcc graph...\n');

      const result = await runXcc(xccPath, 'graph', cwd);
      channel.appendLine(stripAnsi(result.stdout));
    })
  );

  // Promote candidates
  context.subscriptions.push(
    vscode.commands.registerCommand('xandra.promote', async () => {
      const cwd = getWorkspaceCwd();
      if (!cwd) return;

      const channel = getOutputChannel();
      channel.clear();
      channel.show(true);
      channel.appendLine('Running xcc promote...\n');

      const result = await runXcc(xccPath, 'promote', cwd);
      channel.appendLine(stripAnsi(result.stdout));

      // Offer to preview a candidate
      const previewChoice = await vscode.window.showInformationMessage(
        'Preview CSS for a promotion candidate?',
        'Preview #1', 'Skip'
      );

      if (previewChoice === 'Preview #1') {
        const preview = await runXcc(xccPath, 'promote --preview 0', cwd);
        channel.appendLine('\n--- Preview ---\n');
        channel.appendLine(stripAnsi(preview.stdout));
      }
    })
  );

  // Generate docs
  context.subscriptions.push(
    vscode.commands.registerCommand('xandra.docs', async () => {
      const cwd = getWorkspaceCwd();
      if (!cwd) return;

      const outputPath = vscode.Uri.joinPath(
        vscode.Uri.file(cwd), 'dist', 'compositions.html'
      ).fsPath;

      const channel = getOutputChannel();
      channel.clear();
      channel.show(true);
      channel.appendLine('Generating composition docs...\n');

      const result = await runXcc(xccPath, `docs --output "${outputPath}"`, cwd);
      channel.appendLine(stripAnsi(result.stdout));

      const openChoice = await vscode.window.showInformationMessage(
        'Composition docs generated!',
        'Open in Browser', 'Open in Editor', 'Dismiss'
      );

      if (openChoice === 'Open in Browser') {
        vscode.env.openExternal(vscode.Uri.file(outputPath));
      } else if (openChoice === 'Open in Editor') {
        const doc = await vscode.workspace.openTextDocument(outputPath);
        await vscode.window.showTextDocument(doc);
      }
    })
  );

  // Toggle audit mode
  context.subscriptions.push(
    vscode.commands.registerCommand('xandra.toggleAudit', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const document = editor.document;
      const text = document.getText();

      // Find <html> or <body> tag
      const htmlMatch = text.match(/<html[^>]*>/);
      if (!htmlMatch) {
        vscode.window.showWarningMessage('No <html> tag found');
        return;
      }

      const tagStart = text.indexOf(htmlMatch[0]);
      const tag = htmlMatch[0];

      const edit = new vscode.WorkspaceEdit();

      if (tag.includes('x-audit')) {
        // Remove x-audit
        const newTag = tag.replace(/\s*x-audit/, '').replace(/class="\s*"/, '');
        const range = new vscode.Range(
          document.positionAt(tagStart),
          document.positionAt(tagStart + tag.length)
        );
        edit.replace(document.uri, range, newTag);
        vscode.window.showInformationMessage('Audit mode OFF');
      } else if (tag.includes('class="')) {
        // Add x-audit to existing class
        const newTag = tag.replace(/class="/, 'class="x-audit ');
        const range = new vscode.Range(
          document.positionAt(tagStart),
          document.positionAt(tagStart + tag.length)
        );
        edit.replace(document.uri, range, newTag);
        vscode.window.showInformationMessage('Audit mode ON — ns elements highlighted');
      } else {
        // Add class="x-audit"
        const newTag = tag.replace(/>$/, ' class="x-audit">').replace(/\/>$/, ' class="x-audit"/>');
        const range = new vscode.Range(
          document.positionAt(tagStart),
          document.positionAt(tagStart + tag.length)
        );
        edit.replace(document.uri, range, newTag);
        vscode.window.showInformationMessage('Audit mode ON — ns elements highlighted');
      }

      await vscode.workspace.applyEdit(edit);
    })
  );
}

function getWorkspaceCwd() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showWarningMessage('No workspace folder open');
    return null;
  }
  return folders[0].uri.fsPath;
}

/**
 * Strip ANSI escape codes from xcc output
 */
function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

module.exports = { registerCommands };
