import * as vscode from 'vscode';

export type CompressionLevel = 'none' | 'smart' | 'aggressive';

export function compress(content: string, filePath: string, level: CompressionLevel): string {
  if (level === 'none') return content;

  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  let result = content;

  if (level === 'smart' || level === 'aggressive') {
    result = stripComments(result, ext);
    result = collapseBlankLines(result);
    result = trimTrailingWhitespace(result);
  }

  if (level === 'aggressive') {
    result = collapseConsecutiveImports(result, ext);
    result = removeEmptyLines(result);
  }

  return result;
}

function stripComments(content: string, ext: string): string {
  const cLike = ['js', 'ts', 'tsx', 'jsx', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'swift', 'kt'];
  const hashLike = ['py', 'rb', 'sh', 'bash', 'zsh', 'yaml', 'yml', 'toml'];
  const htmlLike = ['html', 'xml', 'svg', 'vue', 'svelte'];

  if (cLike.includes(ext)) {
    // Remove single-line comments (but not URLs like https://)
    content = content.replace(/(?<!:)\/\/(?!\/)[^\n]*/g, '');
    // Remove multi-line comments
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  } else if (hashLike.includes(ext)) {
    // Remove hash comments (but not shebangs and not inside strings)
    content = content.replace(/^(\s*)#(?!!\/)(.*)/gm, (match, indent, rest) => {
      if (rest.trim() === '') return '';
      return '';
    });
  } else if (htmlLike.includes(ext)) {
    content = content.replace(/<!--[\s\S]*?-->/g, '');
  } else if (ext === 'css' || ext === 'scss' || ext === 'less') {
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  return content;
}

function collapseBlankLines(content: string): string {
  return content.replace(/\n{3,}/g, '\n\n');
}

function trimTrailingWhitespace(content: string): string {
  return content.split('\n').map(line => line.trimEnd()).join('\n');
}

function collapseConsecutiveImports(content: string, ext: string): string {
  const jsLike = ['js', 'ts', 'tsx', 'jsx'];
  if (!jsLike.includes(ext)) return content;

  const lines = content.split('\n');
  const result: string[] = [];
  let inImportBlock = false;

  for (const line of lines) {
    const isImport = /^import\s/.test(line.trim()) || /^(const|let|var)\s.*=\s*require\(/.test(line.trim());
    if (isImport) {
      if (!inImportBlock) inImportBlock = true;
      result.push(line);
    } else {
      if (inImportBlock && line.trim() === '') {
        inImportBlock = false;
        continue; // skip blank line after import block
      }
      inImportBlock = false;
      result.push(line);
    }
  }

  return result.join('\n');
}

function removeEmptyLines(content: string): string {
  return content.split('\n').filter(line => line.trim() !== '').join('\n');
}

export function estimateTokens(text: string): number {
  // Rough approximation: ~4 chars per token for code
  return Math.ceil(text.length / 4);
}
