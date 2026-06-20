import * as vscode from 'vscode';

export class SelectionManager {
  private selected = new Set<string>();
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  add(relativePath: string): void {
    this.selected.add(relativePath);
    this._onDidChange.fire();
  }

  remove(relativePath: string): void {
    this.selected.delete(relativePath);
    this._onDidChange.fire();
  }

  toggle(relativePath: string): void {
    if (this.selected.has(relativePath)) {
      this.selected.delete(relativePath);
    } else {
      this.selected.add(relativePath);
    }
    this._onDidChange.fire();
  }

  has(relativePath: string): boolean {
    return this.selected.has(relativePath);
  }

  getAll(): string[] {
    return [...this.selected].sort();
  }

  clear(): void {
    this.selected.clear();
    this._onDidChange.fire();
  }

  get size(): number {
    return this.selected.size;
  }
}
