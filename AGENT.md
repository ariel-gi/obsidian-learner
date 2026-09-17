# Personal Learning OS

## 🎯 Overview
Personal Learning OS is an all-in-one, dynamic, personalized learning environment integrated directly into Obsidian. The system adapts to the user, remembers preferences per subject, tracks progression, and autonomously evolves its capabilities through multi-agent loops.

## 🏗️ Architecture
The system utilizes a split-architecture approach:
*   **Obsidian Frontend (Plugin):** Built with TypeScript and React 19. Full-page dashboard UI with 6 pages (Home, Chat, Skills Lab, Progression Map, Subjects, Settings). Opens as a center-pane tab via the 🧠 brain ribbon icon.
*   **Local Python Backend (FastAPI):** Acts as the orchestration "brain." Runs as a local server, hosts multi-agent workflows (LangGraph), handles LLM routing. Start manually with `python main.py` in `learning-os-backend/`.
*   **Obsidian Vault:** Serves as the database. Stores knowledge context, progression state in JSON files, and mastery metadata within note YAML Frontmatter.

## 📁 Project Layout

```text
/
├── learning-os-backend/        # FastAPI orchestration server (multi-agent workflows)
├── learning-os-blueprint/      # System architecture and design documentation
│   └── docs/
│       ├── 00-system-architecture.md
│       ├── 01-frontend-blueprint.md
│       ├── 02-backend-blueprint.md
│       ├── 03-data-schema.md
│       ├── 04-skill-evolution-loop.md
│       └── 05-dev-session-notes.md  ← IMPORTANT: read this for build setup & bug history
├── learning-os-plugin/         # Obsidian TypeScript/React plugin (SOURCE)
│   ├── src/
│   │   ├── main.ts             # Plugin entry point
│   │   ├── api/                # Backend HTTP client
│   │   ├── settings/           # Plugin settings UI
│   │   └── ui/
│   │       └── App.tsx         # Entire dashboard (6 pages, self-contained)
│   ├── esbuild.config.mjs      # Build config
│   └── tsconfig.json           # jsx: "react-jsx" (important — do NOT change to "react")
└── test-vault/                 # Obsidian test vault
    └── .obsidian/plugins/
        └── learning-os-plugin/ # ← Built output goes HERE (Obsidian loads from this folder)
```

## ✨ Core Features (All Static/Mock UI — Not Yet Wired to Backend)
*   **Progression Mapping:** Obsidian Canvas visual topic maps, color-coded by mastery level.
*   **Dynamic Preferences / Skills Lab:** Toggle-able pedagogical modes (Socratic, Metaphor Engine, Visual Bias, Spaced Repetition, Feynman Evaluator, etc.).
*   **Agentic Skill Evolution:** Multi-agent loop (Researcher → Reasoner) to build new skills from vague user requests, with a micro-feedback refinement cycle.
*   **Preferences Chat:** Agent chat for requesting new skills and adjusting settings.
*   **Subject Management:** Per-subject context files, goals, and gap tracking.

## 🔧 Build & Dev Workflow

```bash
cd learning-os-plugin

# Development (watch mode — auto-rebuilds, Hot Reload plugin auto-reloads Obsidian)
npm run dev

# Production build
npm run build
```

**Opening the dashboard in Obsidian:**
- Click the 🧠 brain icon in the left ribbon, OR
- `Cmd+P` → `Open Learning OS Dashboard`

## ⚠️ Critical Build Setup Notes
> These were learned the hard way — see `05-dev-session-notes.md` for full details.

1. **Output folder:** esbuild MUST output to `test-vault/.obsidian/plugins/learning-os-plugin/main.js`. Obsidian determines which folder to load from via the `"dir"` field in its internal manifest registry — verify with `obsidian eval 'code=app.plugins.manifests["learning-os"]'`.

2. **JSX transform:** `tsconfig.json` uses `"jsx": "react-jsx"` and esbuild uses `jsx: "automatic"`. Do NOT revert to `"jsx": "react"` — it breaks React 19.

3. **workspace.json:** Never edit this file manually while Obsidian is running. Obsidian overwrites it on quit. The correct fix for stale views is `detachLeavesOfType()` in `onunload()`.

4. **Debugging tool:** `/usr/local/bin/obsidian` CLI can inspect and control the running Obsidian instance. See `05-dev-session-notes.md` for useful eval commands.
