export type OutputFormat = 'xml' | 'markdown' | 'plain';

interface FileEntry {
  path: string;
  content: string;
}

export function formatOutput(files: FileEntry[], format: OutputFormat, includeTree: boolean): string {
  const parts: string[] = [];

  if (includeTree) {
    parts.push(formatTree(files.map(f => f.path), format));
  }

  for (const file of files) {
    parts.push(formatFile(file, format));
  }

  return parts.join('\n');
}

function formatTree(paths: string[], format: OutputFormat): string {
  const tree = buildTree(paths);

  switch (format) {
    case 'xml':
      return `<project_structure>\n${tree}\n</project_structure>\n`;
    case 'markdown':
      return `## Project Structure\n\`\`\`\n${tree}\n\`\`\`\n`;
    case 'plain':
      return `=== Project Structure ===\n${tree}\n\n`;
  }
}

function formatFile(file: FileEntry, format: OutputFormat): string {
  switch (format) {
    case 'xml':
      return `<file path="${file.path}">\n${file.content}\n</file>\n`;
    case 'markdown':
      const lang = getLanguage(file.path);
      return `### ${file.path}\n\`\`\`${lang}\n${file.content}\n\`\`\`\n`;
    case 'plain':
      return `--- ${file.path} ---\n${file.content}\n\n`;
  }
}

function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
    java: 'java', kt: 'kotlin', swift: 'swift', cs: 'csharp',
    html: 'html', css: 'css', scss: 'scss', json: 'json',
    yaml: 'yaml', yml: 'yaml', toml: 'toml', md: 'markdown',
    sh: 'bash', sql: 'sql', vue: 'vue', svelte: 'svelte',
  };
  return map[ext] || ext;
}

function buildTree(paths: string[]): string {
  const sorted = [...paths].sort();
  const lines: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const parts = sorted[i].split('/');
    const prevParts = i > 0 ? sorted[i - 1].split('/') : [];

    let commonDepth = 0;
    while (commonDepth < prevParts.length && commonDepth < parts.length - 1 && prevParts[commonDepth] === parts[commonDepth]) {
      commonDepth++;
    }

    for (let d = commonDepth; d < parts.length - 1; d++) {
      const indent = '  '.repeat(d);
      const dirLine = `${indent}${parts[d]}/`;
      if (!lines.includes(dirLine)) {
        lines.push(dirLine);
      }
    }

    const indent = '  '.repeat(parts.length - 1);
    lines.push(`${indent}${parts[parts.length - 1]}`);
  }

  return lines.join('\n');
}
