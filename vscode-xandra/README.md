# Xandra CSS for Visual Studio Code

Xandra framework support for VSCode — inline diagnostics, class completion, hover documentation, ns tracking, and composition tools.

## Features

### Inline Diagnostics

Errors and warnings from `xcc check` appear directly in the editor. Conflicting classes, missing ns reasons, redundant values, and double-density issues are surfaced on save.

- Red underlines for errors (conflicts, missing ns reason)
- Yellow underlines for warnings (redundant classes, unknown classes, double density)
- Precise highlighting on the offending class name

### Class Autocompletion

Type inside `class=""` and get all ~85 Xandra classes with:

- **Category grouping** — typography, layout, spacing, components, colors
- **Conflict filtering** — classes that conflict with what's already on the element are hidden
- **Contextual boosting** — likely combinations sorted to the top
- **CSS preview** — see what each class does before selecting

Trigger: start typing `x-` inside a class attribute.

### Hover Documentation

Hover over any x- class to see:

- Description and category
- CSS property preview
- Conflict warnings (what it can't be combined with)
- Suggested combinations
- Implicit child styling info (for `x-card`, `x-nav`, density classes)

### NS Decorations

Inline annotations appear at the end of lines with ns elements:

- **Orange** — leaf ns with reason text (`← ns: needs chart component`)
- **Magenta** — boundary ns (`← boundary: third-party widget`)
- **Red** — ns without data-ns reason (`← ns missing data-ns reason`)

Density regions are also annotated:
- **Indigo** — `← dense region`
- **Green** — `← spacious region`

### Commands

Open the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and type "Xandra":

| Command | What it does |
|---------|-------------|
| **Xandra: Check Current File** | Run `xcc check` on the active file |
| **Xandra: Audit NS Patterns** | Run `xcc audit` on the workspace |
| **Xandra: Audit NS Tree** | Run `xcc audit --tree` — tree visualization |
| **Xandra: Show Composition Graph** | Run `xcc graph` — map composition patterns |
| **Xandra: Find Promotion Candidates** | Run `xcc promote` — find ns patterns ready to standardize |
| **Xandra: Generate Composition Docs** | Run `xcc docs` — generate HTML composition guide |
| **Xandra: Toggle Audit Mode** | Add/remove `x-audit` class on `<html>` for visual debugging |

### Status Bar

A shield icon in the status bar shows that Xandra validation is active. Click it to run a check.

## Requirements

- **xcc** must be installed in your project or globally. The extension auto-detects it from:
  1. `xandra.xccPath` setting (explicit path)
  2. `./xcc/bin/xcc.js` in the workspace
  3. `./node_modules/.bin/xcc`
  4. Global `xcc` command

Install xcc:
```bash
npm install -D xcc
```

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `xandra.enable` | `true` | Enable/disable all Xandra features |
| `xandra.xccPath` | `""` | Explicit path to xcc binary (auto-detected if empty) |
| `xandra.validateOnSave` | `true` | Run `xcc check` when saving HTML/Vue/Svelte files |
| `xandra.validateOnType` | `false` | Run `xcc check` while typing (800ms debounce) |
| `xandra.showNsDecorations` | `true` | Show inline ns reason annotations |
| `xandra.showDensityIndicators` | `true` | Show density region annotations |

## Supported Languages

- HTML (`.html`)
- Vue (`.vue`)
- Svelte (`.svelte`)

## Installation

### From Source

```bash
cd vscode-xandra
npm install
npm run build
```

Then either:
- Open VSCode, go to Extensions, click "..." > "Install from VSIX", and select the `.vsix` file after running `npm run package`
- Or symlink the extension directory into `~/.vscode/extensions/`

### Development

```bash
cd vscode-xandra
npm install
npm run watch    # Rebuild on changes
```

Press F5 in VSCode to launch an Extension Development Host.

## Architecture

```
vscode-xandra/
├── src/
│   ├── extension.js     # Activation, provider registration
│   ├── catalog.js       # ~85 class definitions with metadata
│   ├── completion.js    # Class completion inside class=""
│   ├── hover.js         # Hover documentation with CSS preview
│   ├── diagnostics.js   # xcc check → VSCode diagnostics
│   ├── decorations.js   # Inline ns and density annotations
│   ├── commands.js      # 7 command registrations
│   └── utils.js         # xcc discovery, workspace helpers
├── out/                 # Bundled output (esbuild)
├── package.json         # Extension manifest
└── esbuild.js           # Build script
```

The extension bundles to a single 29KB file via esbuild. Zero runtime dependencies — it shells out to `xcc` for validation and analysis.

## License

MIT
