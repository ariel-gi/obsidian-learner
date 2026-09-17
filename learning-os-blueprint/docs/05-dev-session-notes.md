# Dev Session Notes — 2026-09-09

## What Was Built This Session

### 1. Full Dashboard UI Redesign
Replaced the old tab-based `App.tsx` + scattered sidebar files with a single, full-page web-app style dashboard. The new UI opens as a **center-pane tab** (like a note), not a sidebar panel.

**6 pages accessible via a persistent left nav:**
| Page | Contents |
|---|---|
| Home | Stat cards, Quick Generate input, Recent Artifacts list |
| Chat | Full Preferences Agent chat UI with suggestion chips |
| Skills Lab | All 7 skills with live toggles, status badges, star ratings |
| Progression Map | SVG node graph preview colored by mastery level |
| Subjects | Subject switcher + detail panel (goals, gaps, context file preview) |
| Settings | Backend URL, API key, connection tester |

**Files deleted (old UI):**
- `src/ui/ChatSidebar.tsx`
- `src/ui/Dashboard.tsx`
- `src/ui/DashboardView.tsx`
- `src/ui/SidebarView.tsx`
- `src/ui/widgets/` (empty dir)

**Files created/rewritten:**
- `src/ui/App.tsx` — entire dashboard, all 6 pages self-contained
- `src/main.ts` — rewrote entry point; opens view as center tab, not sidebar

---

## Bugs Found & Fixed This Session

### Bug 1 — Wrong Build Output Folder (ROOT CAUSE of all stale-code issues)

**Symptom:** Every `npm run build` succeeded silently but Obsidian kept loading old code.

**Root cause:** `esbuild.config.mjs` was writing to:
```
.obsidian/plugins/learning-os/main.js
```
But Obsidian's manifest (discovered on first install) recorded `"dir": ".obsidian/plugins/learning-os-plugin"`. Obsidian **always loads from the dir stored in its manifest**, not from any folder named after the plugin ID.

**Fix:** Changed `outfile` in `esbuild.config.mjs` to:
```
.obsidian/plugins/learning-os-plugin/main.js
```

> ⚠️ **Key lesson:** When Obsidian first scans a vault for plugins, it reads each `manifest.json` and records its parent folder path as `"dir"` in its internal manifest registry. All future loads come from that `dir`. It does NOT necessarily match the plugin's `id` field. If you ever move or rename the plugin folder, Obsidian will not automatically update. You must verify with:
> ```js
> obsidian eval 'code=app.plugins.manifests["learning-os"]'
> // Check the "dir" field — that's where Obsidian loads from
> ```

---

### Bug 2 — Wrong JSX Transform Mode

**Symptom:** esbuild built successfully but the output was broken / React 19 APIs crashed at runtime.

**Root cause:** `tsconfig.json` had `"jsx": "react"` (legacy transform), which injects `React.createElement()` calls — but the old `SidebarView.tsx` used `ReactDOM.render()` and `ReactDOM.unmountComponentAtNode()`, both **removed in React 19**. This caused:
```
TypeError: ReactDOM.render is not a function
TypeError: ReactDOM.unmountComponentAtNode is not a function
```

**Fix:**
1. `tsconfig.json`: `"jsx": "react"` → `"jsx": "react-jsx"`
2. `esbuild.config.mjs`: Added `jsx: "automatic"` and `jsxImportSource: "react"`
3. Removed `"outDir": "./"` from `tsconfig.json` (was causing TS to scatter `.js` files in `src/`)
4. `.tsx` component files no longer need `import * as React from 'react'` at the top
5. `main.ts` (non-tsx) still uses `React.createElement()` and keeps the `import * as React` line

---

### Bug 3 — Stale `workspace.json` Re-Saving on Quit

**Symptom:** Manual edits to `workspace.json` (removing old view entries) were undone every time Obsidian restarted. The ghost panel with the `bot` icon kept coming back.

**Root cause:** Obsidian **overwrites `workspace.json` on every quit** with its current in-memory state. If a stale leaf of an old view type is open in the right sidebar, it gets re-serialized. Editing `workspace.json` while Obsidian is running does nothing — Obsidian will overwrite it on exit.

**Fix:** Add `detachLeavesOfType()` calls for all old view type strings in `onunload()`:
```typescript
onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_LEARNING_OS);
    // Clean up stale view types from older plugin versions
    this.app.workspace.detachLeavesOfType('learning-os-chat-view');
    this.app.workspace.detachLeavesOfType('learning-os-view');
    this.app.workspace.detachLeavesOfType('learning-os-dashboard-view');
}
```
> ⚠️ **Key lesson:** Never try to fix `workspace.json` manually while Obsidian is running. The only reliable fix is `detachLeavesOfType()` in `onunload()`. When you rename a view type, always add the **old** type string to this call for at least one release cycle.

---

### Bug 4 — Ribbon Icon Not Appearing (Orphaned `hiddenItems` Key)

**Symptom:** The brain icon was registered in code but not appearing in the ribbon.

**Root cause:** `workspace.json`'s `left-ribbon.hiddenItems` had an entry keyed by the OLD action title:
```json
"learning-os:Open Learning OS Preferences": false
```
The new action title was `"Open Learning OS Dashboard"`. The new key was never written because Obsidian was loading old code (Bug 1). Once Bug 1 was fixed, the ribbon appeared correctly. The orphaned old key is harmless dead data.

**Key insight:** Ribbon item keys in `hiddenItems` follow the format `"<plugin-id>:<ribbon-action-title>"`. A missing key = visible (not hidden). A key set to `true` = hidden. Renaming a ribbon action between versions causes the old key to become orphaned dead data but does NOT hide the new icon.

---

## Debugging Tools Discovered

### The Obsidian CLI (`/usr/local/bin/obsidian`)
An incredibly powerful debugging tool. It communicates with the running Obsidian instance.

```bash
# Attach the debugger (must do this first to capture console output)
obsidian dev:debug on

# Read console output from Obsidian
obsidian dev:console

# Read captured errors
obsidian dev:errors

# Execute arbitrary JavaScript inside the running Obsidian
obsidian eval 'code=<javascript>'
```

**Most useful eval commands for plugin debugging:**
```bash
# Check which plugins are loaded
obsidian eval 'code=Object.keys(app.plugins.plugins).join(", ")'

# Check all registered view types
obsidian eval 'code=Object.keys(app.viewRegistry.viewByType).join(", ")'

# Check which folder Obsidian is ACTUALLY loading the plugin from
obsidian eval 'code=app.plugins.manifests["learning-os"]'

# Check which methods the plugin has (confirm it's the right version)
obsidian eval 'code=Object.getOwnPropertyNames(Object.getPrototypeOf(app.plugins.plugins["learning-os"])).join(", ")'

# Check ribbon items in DOM
obsidian eval 'code=Array.from(document.querySelectorAll(".side-dock-ribbon-action")).map(el => el.getAttribute("aria-label")).join(", ")'

# Verify the file on disk has the right content
obsidian eval 'code=(async () => { const fs = require("fs"); const path = app.vault.adapter.getBasePath() + "/.obsidian/plugins/learning-os-plugin/main.js"; const c = fs.readFileSync(path, "utf8"); return { hasNewCode: c.includes("openDashboard"), size: c.length }; })()'

# Force-reload the plugin without restarting Obsidian
obsidian eval 'code=(async () => { app.workspace.detachLeavesOfType("learning-os-chat-view"); await app.plugins.disablePlugin("learning-os"); await new Promise(r => setTimeout(r, 800)); await app.plugins.enablePlugin("learning-os"); return "done"; })()'

# Check which vault is open
obsidian eval 'code=app.vault.adapter.getBasePath()'
```

---

## Current Project State (End of Session)

### Plugin (`learning-os-plugin/`)
- ✅ Full 6-page dashboard UI in `src/ui/App.tsx` (all static/mock data)
- ✅ `src/main.ts` — opens as center-pane tab, proper React 19 lifecycle
- ✅ `src/settings/SettingsTab.ts` — settings UI with connection tester
- ✅ `src/api/backendClient.ts` — HTTP client wired to settings
- ✅ Build output goes to the correct folder (`plugins/learning-os-plugin/`)
- ✅ JSX transform fixed (`react-jsx` mode)
- ⬜ No AI features wired yet — all UI is static mock data

### Backend (`learning-os-backend/`)
- ✅ FastAPI skeleton with `/health`, `/artifacts/generate`, `/skills/request_new` routes
- ✅ Pydantic schemas in `src/models/schemas.py`
- ✅ LLM client in `src/llm/client.py` (reads API key/endpoint from request headers)
- ⬜ Agent logic (LangGraph/Researcher/Reasoner) not yet implemented — routes return placeholders

### What's NOT running yet (and doesn't need to be)
The Python backend does not need to be running to use the dashboard UI. It's only needed when real AI features are wired in.

---

## Build & Dev Workflow (Correct Procedure)

```bash
# One-time setup
cd learning-os-plugin
npm install

# Development (watch mode — auto-rebuilds on save, Hot Reload plugin picks it up)
npm run dev

# Production build
npm run build
```

The Hot Reload plugin is installed in the test vault. With `npm run dev` running, saving any `.ts`/`.tsx` file triggers an instant rebuild and Obsidian auto-reloads the plugin — no restart needed.

### Opening the dashboard in Obsidian
1. Click the **🧠 brain icon** in the left ribbon, OR
2. `Cmd+P` → `Open Learning OS Dashboard`

---

## Plugin Folder Layout (Actual — Not Blueprint)

```text
learning-os-plugin/
├── esbuild.config.mjs          # Build config — outfile MUST point to learning-os-plugin/
├── tsconfig.json               # jsx: "react-jsx" (NOT "react"), no outDir
├── package.json
├── manifest.json
├── styles.css
└── src/
    ├── main.ts                 # Plugin entry point — registers view, ribbon, command
    ├── api/
    │   └── backendClient.ts    # HTTP client for FastAPI backend
    ├── settings/
    │   ├── SettingsTab.ts      # Obsidian settings panel
    │   └── defaultSettings.ts  # Default config values
    └── ui/
        └── App.tsx             # Entire dashboard (6 pages, all self-contained)

test-vault/.obsidian/plugins/
├── learning-os-plugin/         # ← Obsidian ACTUALLY loads from here (check manifest "dir")
│   ├── main.js                 # Built output
│   ├── manifest.json
│   └── styles.css
└── learning-os/                # ← Old folder, now irrelevant (don't delete, Obsidian ignores it)
```

---

## Next Session: Suggested Priorities

1. **Wire up the Chat page** to `backendClient.requestNewSkill()` — replace the mock `setTimeout` with a real POST to `/skills/request_new`
2. **Wire up Quick Generate** (Home page) to `/artifacts/generate`
3. **Implement the Skills toggle** to persist to `/.obsidian/learning-os-data/skills.json` via the vault layer
4. **Start the LangGraph agent pipeline** in the backend (Researcher → Reasoner for skill creation)
5. **Canvas manager** — implement `canvasManager.ts` to generate/update `.canvas` files from mastery data

---

## Bug 5 — Dashboard Disappears on Every Hot-Reload (2026-09-12)

**Symptom:** After any file save during `npm run dev`, the dashboard tab went blank. Only switching vaults and back would restore it.

**Root cause:** `onunload()` called `detachLeavesOfType(VIEW_TYPE_LEARNING_OS)`, which destroyed the open tab. Hot-reload calls `onunload()` on every reload, so every save killed the tab.

**Fix:** Removed `detachLeavesOfType(VIEW_TYPE_LEARNING_OS)` from `onunload()`. Hot-reload and Obsidian manage the active view's lifecycle automatically. Only legacy stale view type strings need manual cleanup in `onunload()`.

**Rule:** Never call `detachLeavesOfType` for your CURRENT view type in `onunload()` if you want hot-reload to work correctly.
