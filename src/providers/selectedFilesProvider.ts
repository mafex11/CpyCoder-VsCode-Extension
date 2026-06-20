import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SelectionManager } from './selectionManager';

export class SelectedFilesProvider implements vscode.TreeDataProvider<SelectedFileItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SelectedFileItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private selectionManager: SelectionManager) {
    selectionManager.onDidChange(() => this._onDidChangeTreeData.fire(undefined));
  }

  getTreeItem(element: SelectedFileItem): vscode.TreeItem {
    return element;
  }

  getChildren(): SelectedFileItem[] {
    const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const files = this.selectionManager.getAll();
    return files.map(f => new SelectedFileItem(f, rootPath));
  }
}

class SelectedFileItem extends vscode.TreeItem {
  constructor(public readonly relativePath: string, rootPath: string) {
    super(path.basename(relativePath), vscode.TreeItemCollapsibleState.None);

    const fullPath = path.join(rootPath, relativePath);
    let tokenStr = '';
    try {
      const stat = fs.statSync(fullPath);
      const tokens = Math.ceil(stat.size / 4);
      tokenStr = tokens >= 1000 ? `~${(tokens / 1000).toFixed(1)}k tok` : `~${tokens} tok`;
    } catch {
      tokenStr = '?';
    }

    const dir = path.dirname(relativePath);
    this.description = `${dir === '.' ? '' : dir + '  '}${tokenStr}`;
    this.tooltip = `${relativePath} (${tokenStr})`;
    this.contextValue = 'selectedFile';
    this.iconPath = new vscode.ThemeIcon('file');
    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [vscode.Uri.file(fullPath)]
    };
  }
}
