# AGENTS.md

## Architecture

Single-page vanilla JS PDF/image editor. No framework, no build system, no package.json. Just open `index.html` in a browser.

- **Entrypoint**: `index.html`
- **Styles**: `style.css` (root)
- **Scripts** (in order): `js/state.js` → `js/ui.js` → `js/pdf-ops.js` → `js/app.js`
- All functions use global scope (no ES modules). Keep new code in the same style.

## Dependencies

All loaded via CDN in `index.html` — do **not** add npm packages or node modules:
- pdf.js 3.11.174
- pdf-lib 1.17.1
- JSZip 3.10.1
- Google Fonts (Plus Jakarta Sans, JetBrains Mono)

## Commands

No build, lint, test, or typecheck commands. Open `index.html` in a browser to verify changes.

## Script Load Order

`state.js` must load first (sets up globals, utils, history). `ui.js` and `pdf-ops.js` depend on state globals. `app.js` wires DOM events and initializes — it must load last. Never introduce circular dependencies between these files.

## State & History

- `state.js` owns the central `pagePool` (Map), `pages` (array), `selIds` (Set), and undo/redo stacks.
- `saveHistory()` must be called before any mutation (rotate, delete, reorder, crop, resize).
- History stores a shallow snapshot of page metadata (not full image data). Max 60 entries.

## Shell

Windows PowerShell. `&&` does not work — use `; if ($?) { cmd }`.

## OpenCode Config

- Default agent: `orquestrador` (`.opencode/agents/orquestrador.md`)
- Subagents: detetive (diagnose), implementador (implement), revisor (review), testador (test)
- Skills: `pipeline-orquestrador`, `pipeline-subagente`, `agente-builder`
- Plugin: `superpowers`
