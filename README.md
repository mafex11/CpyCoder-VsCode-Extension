# CpyCoder v2

Copy your repo context — compressed, AI-ready — to clipboard or file. Built for developers who use ChatGPT, Claude, or any external AI chat interface where the agent doesn't have direct repo access.

## Features

- **Smart compression** — strips comments, collapses whitespace, keeps code readable for AI
- **Multiple output formats** — XML (best for LLMs), Markdown, or plain text
- **Respects .gitignore** — no node_modules or build artifacts cluttering your picker
- **Token estimation** — see how many tokens you're about to paste before you do it
- **File tree summary** — automatically prepends project structure for context
- **Export options** — copy to clipboard or save to file
- **Folder selection** — click a folder to select all files inside
- **Open editors shortcut** — instantly select all your currently open tabs

## Usage

1. Open the CpyCoder panel in the activity bar (left sidebar)
2. Click files/folders in the "Files" view to select them
3. Use the toolbar buttons to:
   - Copy to clipboard (or `Cmd+Shift+C` / `Ctrl+Shift+C`)
   - Export to file
   - Clear selection

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `cpycoder.compression` | `smart` | `none`, `smart`, or `aggressive` |
| `cpycoder.outputFormat` | `xml` | `xml`, `markdown`, or `plain` |
| `cpycoder.includeTreeSummary` | `true` | Prepend directory tree |
| `cpycoder.maxTokenEstimate` | `100000` | Warn above this token count |
| `cpycoder.respectGitignore` | `true` | Hide gitignored files |
| `cpycoder.excludePatterns` | `[...]` | Additional glob patterns to exclude |

## Compression Levels

**Smart** (default): Strips comments, collapses consecutive blank lines, trims trailing whitespace. Code remains fully readable.

**Aggressive**: Additionally removes all empty lines and collapses import blocks. Maximum token savings while maintaining parseability.

## Output Format Example (XML)

```xml
<project_structure>
src/
  index.ts
  utils/
    helper.ts
</project_structure>

<file path="src/index.ts">
import { helper } from './utils/helper';
export function main() {
  return helper();
}
</file>

<file path="src/utils/helper.ts">
export function helper() {
  return 'hello';
}
</file>
```

## Installation

### From Marketplace
[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=Mafex.cpycoder)

### From VSIX (Local)

```bash
npm run package
code --install-extension cpycoder-2.0.0.vsix
```

## License

MIT
