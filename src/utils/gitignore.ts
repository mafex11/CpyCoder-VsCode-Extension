import * as fs from 'fs';
import * as path from 'path';
import ignore, { Ignore } from 'ignore';

let cachedIgnore: Ignore | null = null;
let cachedRoot: string | null = null;

export function getIgnoreFilter(rootPath: string): Ignore {
  if (cachedIgnore && cachedRoot === rootPath) return cachedIgnore;

  const ig = ignore();

  // Always ignore these
  ig.add(['.git', 'node_modules', '.DS_Store']);

  // Walk up and find all .gitignore files
  const gitignorePath = path.join(rootPath, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    ig.add(content);
  }

  // Check nested .gitignore files
  addNestedGitignores(rootPath, rootPath, ig);

  cachedIgnore = ig;
  cachedRoot = rootPath;
  return ig;
}

function addNestedGitignores(dir: string, rootPath: string, ig: Ignore, depth = 0): void {
  if (depth > 5) return; // prevent infinite recursion

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules' || entry.name === '.git') continue;

      const subDir = path.join(dir, entry.name);
      const subGitignore = path.join(subDir, '.gitignore');

      if (fs.existsSync(subGitignore)) {
        const content = fs.readFileSync(subGitignore, 'utf-8');
        const relDir = path.relative(rootPath, subDir);
        const lines = content.split('\n').map(line => {
          if (line.trim() === '' || line.startsWith('#')) return line;
          return `${relDir}/${line}`;
        });
        ig.add(lines.join('\n'));
      }

      addNestedGitignores(subDir, rootPath, ig, depth + 1);
    }
  } catch {
    // permission denied, etc.
  }
}

export function invalidateCache(): void {
  cachedIgnore = null;
  cachedRoot = null;
}

export function shouldInclude(relativePath: string, rootPath: string): boolean {
  const ig = getIgnoreFilter(rootPath);
  return !ig.ignores(relativePath);
}
