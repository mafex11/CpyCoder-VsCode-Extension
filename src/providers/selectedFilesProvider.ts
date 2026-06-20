import * as vscode from 'vscode';
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
    const files = this.selectionManager.getAll();
    return files.map(f => new SelectedFileItem(f));
  }
}

class SelectedFileItem extends vscode.TreeItem {
  constructor(public readonly relativePath: string) {
    super(path.basename(relativePath), vscode.TreeItemCollapsibleState.None);
    this.description = path.dirname(relativePath) === '.' ? '' : path.dirname(relativePath);
    this.tooltip = relativePath;
    this.contextValue = 'selectedFile';
    this.iconPath = new vscode.ThemeIcon('file');
    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [vscode.Uri.file(
        path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', relativePath)
      )]
    };
  }
}
