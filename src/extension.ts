import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileTreeProvider, FileTreeItem } from './providers/fileTreeProvider';
import { SelectedFilesProvider } from './providers/selectedFilesProvider';
import { SelectionManager } from './providers/selectionManager';
import { compress, estimateTokens, CompressionLevel } from './utils/compressor';
import { formatOutput, OutputFormat } from './utils/formatter';
import { shouldInclude } from './utils/gitignore';

export function activate(context: vscode.ExtensionContext) {
  const selectionManager = new SelectionManager();
  const fileTreeProvider = new FileTreeProvider(selectionManager);
  const selectedFilesProvider = new SelectedFilesProvider(selectionManager);

  vscode.window.registerTreeDataProvider('cpycoder.fileTree', fileTreeProvider);
  vscode.window.registerTreeDataProvider('cpycoder.selected', selectedFilesProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand('cpycoder.toggleFile', (item: FileTreeItem) => {
      selectionManager.toggle(item.relativePath);
    }),

    vscode.commands.registerCommand('cpycoder.toggleFolder', (item: FileTreeItem) => {
      const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!rootPath) return;

      const files = getAllFilesInFolder(item.absolutePath, rootPath);
      const allSelected = files.every(f => selectionManager.has(f));

      if (allSelected) {
        files.forEach(f => selectionManager.remove(f));
      } else {
        files.forEach(f => selectionManager.add(f));
      }
    }),

    vscode.commands.registerCommand('cpycoder.removeFromSelected', (item: { relativePath: string }) => {
      selectionManager.remove(item.relativePath);
    }),

    vscode.commands.registerCommand('cpycoder.clearSelection', () => {
      selectionManager.clear();
      vscode.window.showInformationMessage('CpyCoder: Selection cleared');
    }),

    vscode.commands.registerCommand('cpycoder.refreshTree', () => {
      fileTreeProvider.refresh();
    }),

    vscode.commands.registerCommand('cpycoder.selectOpenEditors', () => {
      const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!rootPath) return;

      let count = 0;
      for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
          if (tab.input instanceof vscode.TabInputText) {
            const filePath = tab.input.uri.fsPath;
            if (filePath.startsWith(rootPath)) {
              const rel = path.relative(rootPath, filePath);
              if (!selectionManager.has(rel)) {
                selectionManager.add(rel);
                count++;
              }
            }
          }
        }
      }
      vscode.window.showInformationMessage(`CpyCoder: Added ${count} open editor(s)`);
    }),

    vscode.commands.registerCommand('cpycoder.copyToClipboard', async () => {
      const output = buildOutput(selectionManager);
      if (!output) return;

      await vscode.env.clipboard.writeText(output.text);

      const tokens = estimateTokens(output.text);
      const config = vscode.workspace.getConfiguration('cpycoder');
      const maxTokens = config.get<number>('maxTokenEstimate', 100000);

      let msg = `Copied ${output.fileCount} file(s) (~${formatTokenCount(tokens)} tokens)`;
      if (tokens > maxTokens) {
        vscode.window.showWarningMessage(`${msg} — exceeds ${formatTokenCount(maxTokens)} token limit!`);
      } else {
        vscode.window.showInformationMessage(msg);
      }
    }),

    vscode.commands.registerCommand('cpycoder.exportToFile', async () => {
      const output = buildOutput(selectionManager);
      if (!output) return;

      const config = vscode.workspace.getConfiguration('cpycoder');
      const format = config.get<OutputFormat>('outputFormat', 'xml');
      const ext = format === 'xml' ? 'xml' : format === 'markdown' ? 'md' : 'txt';

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(
          path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, `context.${ext}`)
        ),
        filters: { 'Context Files': [ext, 'txt'] }
      });

      if (uri) {
        fs.writeFileSync(uri.fsPath, output.text, 'utf-8');
        const tokens = estimateTokens(output.text);
        vscode.window.showInformationMessage(
          `Exported ${output.fileCount} file(s) to ${path.basename(uri.fsPath)} (~${formatTokenCount(tokens)} tokens)`
        );
      }
    })
  );
}

function buildOutput(selectionManager: SelectionManager): { text: string; fileCount: number } | null {
  const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!rootPath) {
    vscode.window.showErrorMessage('No workspace open');
    return null;
  }

  const selected = selectionManager.getAll();
  if (selected.length === 0) {
    vscode.window.showWarningMessage('No files selected. Use the CpyCoder panel to pick files.');
    return null;
  }

  const config = vscode.workspace.getConfiguration('cpycoder');
  const compressionLevel = config.get<CompressionLevel>('compression', 'smart');
  const outputFormat = config.get<OutputFormat>('outputFormat', 'xml');
  const includeTree = config.get<boolean>('includeTreeSummary', true);

  const files: { path: string; content: string }[] = [];

  for (const relPath of selected) {
    const fullPath = path.join(rootPath, relPath);
    try {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const content = compress(raw, relPath, compressionLevel);
      files.push({ path: relPath, content });
    } catch {
      // skip unreadable files
    }
  }

  if (files.length === 0) {
    vscode.window.showWarningMessage('No readable files found in selection.');
    return null;
  }

  const text = formatOutput(files, outputFormat, includeTree);
  return { text, fileCount: files.length };
}

function getAllFilesInFolder(folderPath: string, rootPath: string): string[] {
  const results: string[] = [];

  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      if (!shouldInclude(relativePath, rootPath)) continue;

      if (entry.isDirectory()) {
        results.push(...getAllFilesInFolder(fullPath, rootPath));
      } else if (entry.isFile()) {
        results.push(relativePath);
      }
    }
  } catch {
    // permission denied, etc.
  }

  return results;
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return tokens.toString();
}

export function deactivate() {}
