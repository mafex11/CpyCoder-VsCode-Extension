import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { shouldInclude, invalidateCache } from '../utils/gitignore';
import { SelectionManager } from './selectionManager';

export class FileTreeProvider implements vscode.TreeDataProvider<FileTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<FileTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private selectionManager: SelectionManager) {
    selectionManager.onDidChange(() => this._onDidChangeTreeData.fire(undefined));
  }

  refresh(): void {
    invalidateCache();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: FileTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FileTreeItem): FileTreeItem[] {
    const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!rootPath) return [];

    const dir = element ? element.absolutePath : rootPath;
    const config = vscode.workspace.getConfiguration('cpycoder');
    const respectGitignore = config.get<boolean>('respectGitignore', true);
    const excludePatterns = config.get<string[]>('excludePatterns', []);

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const items: FileTreeItem[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(rootPath, fullPath);

        if (respectGitignore && !shouldInclude(relativePath, rootPath)) continue;
        if (this.matchesExcludePattern(relativePath, excludePatterns)) continue;

        if (entry.isDirectory()) {
          const folderSelected = this.isFolderFullySelected(fullPath, rootPath);
          const folderPartial = !folderSelected && this.isFolderPartiallySelected(fullPath, rootPath);

          items.push(new FileTreeItem(
            entry.name,
            fullPath,
            relativePath,
            true,
            folderSelected ? 'selected' : folderPartial ? 'partial' : 'none'
          ));
        } else if (entry.isFile()) {
          const selected = this.selectionManager.has(relativePath);
          items.push(new FileTreeItem(
            entry.name,
            fullPath,
            relativePath,
            false,
            selected ? 'selected' : 'none'
          ));
        }
      }

      // Sort: folders first, then alphabetical
      items.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.label!.toString().localeCompare(b.label!.toString());
      });

      return items;
    } catch {
      return [];
    }
  }

  private isFolderFullySelected(folderPath: string, rootPath: string): boolean {
    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          const rel = path.relative(rootPath, path.join(folderPath, entry.name));
          if (!this.selectionManager.has(rel)) return false;
        }
      }
      return entries.some(e => e.isFile());
    } catch { return false; }
  }

  private isFolderPartiallySelected(folderPath: string, rootPath: string): boolean {
    const prefix = path.relative(rootPath, folderPath);
    for (const selected of this.selectionManager.getAll()) {
      if (selected.startsWith(prefix + '/')) return true;
    }
    return false;
  }

  private matchesExcludePattern(relativePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      const regex = globToRegex(pattern);
      if (regex.test(relativePath)) return true;
    }
    return false;
  }
}

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  return new RegExp(`^${escaped}$`);
}

export class FileTreeItem extends vscode.TreeItem {
  constructor(
    public readonly fileName: string,
    public readonly absolutePath: string,
    public readonly relativePath: string,
    public readonly isFolder: boolean,
    public readonly selectionState: 'none' | 'selected' | 'partial'
  ) {
    super(
      fileName,
      isFolder ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    );

    this.contextValue = isFolder ? 'folder' : 'file';
    this.tooltip = relativePath;

    if (isFolder) {
      this.iconPath = new vscode.ThemeIcon(
        selectionState === 'selected' ? 'folder-active' :
        selectionState === 'partial' ? 'folder-opened' : 'folder'
      );
      this.command = {
        command: 'cpycoder.toggleFolder',
        title: 'Toggle Folder',
        arguments: [this]
      };
    } else {
      this.iconPath = new vscode.ThemeIcon(
        selectionState === 'selected' ? 'check' : 'file'
      );
      this.command = {
        command: 'cpycoder.toggleFile',
        title: 'Toggle File',
        arguments: [this]
      };
      this.description = selectionState === 'selected' ? '$(check)' : '';
    }
  }
}
