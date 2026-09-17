# Learning OS — Project Context Document
*Last updated: 2026-09-12. Use this as the starting context for any new planning or implementation session.*

---

## What This Project Is

**Learning OS** is a personal AI-powered learning environment built entirely inside Obsidian. It turns a student's own vault notes into the context for an AI tutor that generates personalized learning artifacts (study notes, flashcards, Feynman sheets, practice problems) using composable "skill" modifiers that shape how the AI teaches.

The core philosophy: **your notes are the curriculum**. Instead of asking an AI to teach you Calculus generically, you select your own lecture notes and the AI generates materials that are grounded in what you've actually been taught, styled exactly how you learn best.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Obsidian (Desktop App)                 │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Learning OS Plugin (TypeScript + React 19)       │    │
│  │  • Full-page dashboard UI (7-page SPA in a tab)  │    │
│  │  • Reads/writes vault files directly              │    │
│  │  • Stores settings in plugin data.json            │    │
│  └──────────────────────┬───────────────────────────┘    │
│                         │ HTTP (localhost:8000)           │
│  ┌──────────────────────▼───────────────────────────┐    │
│  │  Python FastAPI Backend (local server)            │    │
│  │  • Orchestrates LLM calls                         │    │
│  │  • Composes skill system prompts                  │    │
│  │  • Routes to any OpenAI-compatible endpoint       │    │
│  └──────────────────────┬───────────────────────────┘    │
│                         │ HTTPS (API call)                │
└─────────────────────────┼───────────────────────────────┘
                          │
              ┌───────────▼───────────┐
              │  LLM Provider (BYOK)  │
              │  OpenAI / Groq /      │
              │  Anthropic / Ollama   │
              └───────────────────────┘
```

**Key architectural decisions:**
- **BYOK (Bring Your Own Key):** User's API key is entered in plugin settings and sent as `X-API-Key` header to the local backend. Never stored in a cloud database — only in local `data.json` inside the vault.
- **OpenAI-compatible endpoint:** The backend accepts any OpenAI-compatible base URL, meaning you can swap providers (Groq, Ollama, LiteLLM) by changing a single setting.
- **Vault as database:** All generated artifacts, subject context, and progression state live as `.md` files inside the Obsidian vault. No external database.
- **Backend is optional for browsing UI:** The dashboard renders and shows vault data without the backend. The backend is only needed for AI generation.

---

## What's Actually Built (Current State)

### Plugin — `learning-os-plugin/`

#### Entry Point — `src/main.ts`
- Registers `learning-os-dashboard` view type as a center-pane tab (not sidebar)
- Adds 🧠 brain ribbon icon and `Cmd+P` command to open dashboard
- Passes Obsidian `App` instance into React tree via constructor
- Settings persistence via `loadData()` / `saveData()`
- `onunload()` only cleans up legacy stale view types — does NOT detach active view (prevents hot-reload blanking)

#### React Context — `src/ui/AppContext.ts`
- `ObsidianAppContext`: React context that threads the Obsidian `App` object through the entire component tree
- `useObsidianApp()`: typed hook — any component can call this to access vault files, workspace, settings, etc.

#### Dashboard App — `src/ui/App.tsx`
A 7-page single-page app inside an Obsidian tab. Left nav sidebar + main content area.

| Nav Item | Page | Status |
|---|---|---|
| 🏠 Home | Stats cards + Quick Generate + Recent Notes | ✅ Live data |
| ⚡ Generate | Artifact Creator (3-step flow) | ✅ Functional |
| 🤖 Chat | Preferences Agent chat UI | 🟡 Mock (no backend wired) |
| 🧪 Skills Lab | Toggle skills on/off | 🟡 Mock state only |
| 🗺️ Prog. Map | SVG node graph of topics | 🟡 Static mock data |
| 📚 Subjects | Subject switcher + detail panel | 🟡 Static mock data |
| ⚙️ Settings | Backend URL, API endpoint, API key, subject path | ✅ Saves to plugin data |

**Home page (live data):**
- **Active Subject card:** reads `activeSubjectPath` from settings, shows real folder name + note count
- **Backend Status card:** pings `/health` on load, shows live green/red indicator
- **Recent Notes:** 5 most recently modified `.md` files in subject folder, clickable (opens in new tab)
- **Quick Generate chips:** clicking any topic navigates directly to the Generate page

#### Artifact Creator — `src/ui/GeneratePage.tsx`
Full 3-step flow:

**Step 1 — Select Notes:**
- Reads all vault folders and their `.md` files from `app.vault.getAllLoadedFiles()`
- Left panel: folder list with file count badges
- Right panel: scrollable file list with checkboxes
- "Select all" / "Clear" buttons
- Continues when ≥1 file selected

**Step 2 — Configure:**
- Topic text input
- Artifact type picker (Study Note / Flashcards / Summary / Feynman Sheet / Practice Problems)
- Skill toggle pills (Socratic / Metaphor Engine / Visual Bias / Spaced Repetition / Feynman Evaluator)
- Calls `backendClient.generateArtifact()` → POSTs to `/artifacts/generate`

**Step 3 — Output:**
- Preview pane (monospace, scrollable, shows raw markdown)
- Line count + char count
- 📋 Copy to clipboard
- Editable output path field + 💾 Save to Vault (creates `.md` in vault, opens in new tab)

#### Backend Client — `src/api/backendClient.ts`
Singleton class, configured from plugin settings. Sends API key + endpoint as headers.
- `checkHealth()` → `GET /health`
- `generateArtifact(payload)` → `POST /artifacts/generate`
- `requestNewSkill(prompt)` → `POST /skills/request_new`

#### Settings — `src/settings/`
- `defaultSettings.ts`: `pythonServerUrl`, `apiEndpoint`, `apiKey`, `activeSubjectPath`
- `SettingsTab.ts`: Obsidian settings panel with Test Connection button

---

### Backend — `learning-os-backend/`

#### `main.py` — FastAPI server
Run with: `source .venv/bin/activate && python3 main.py`
Runs on `http://127.0.0.1:8000`

| Endpoint | What it does |
|---|---|
| `GET /health` | Returns `{"status": "ok"}` — used by plugin's status indicator |
| `POST /artifacts/generate` | Builds system prompt from skills + artifact type, assembles note context, calls LLM, returns `{title, content}` |
| `POST /skills/request_new` | Interprets vague user request as a structured skill definition via LLM |

#### `src/skills/prompts.py` — Skill System
The core intelligence layer. Each skill adds a composable modifier to the LLM system prompt.

**Skill modifiers (stack together when multiple active):**
| Skill ID | What it adds to the prompt |
|---|---|
| `socratic` | Guide with questions; add 💭 Think About It blocks after each concept |
| `metaphor` | Use real-world analogies; add 🔗 Analogy callouts |
| `visual_bias` | Force Mermaid diagrams over prose; use Obsidian mermaid syntax |
| `spaced_rep` | Add 🃏 Spaced Repetition section with 5-10 Anki Q&A pairs at the end |
| `feynman` | Add ✏️ Feynman Check blocks + Common Misconception warnings |

**Artifact type instructions:**
| Type | Output format |
|---|---|
| `study_note` | Structured note with overview, key concepts, examples, summary |
| `flashcards` | 15-25 Q&A pairs, `---` delimited |
| `summary` | ≤400 word TL;DR with bullets |
| `feynman` | Teach-it-back sheet with prerequisite mapping |
| `practice` | 8-12 problems (warm-up / standard / challenge) with full solutions |

#### `src/llm/client.py` — LLM Client
Reads `X-API-Key` and `X-API-Base` headers from every request. Falls back to `OPENAI_API_KEY` env var. Returns an `AsyncOpenAI` client pointed at whatever endpoint the user configured.

#### `src/models/schemas.py` — Pydantic Models
Request/response schemas: `GenerateArtifactRequest`, `GenerateArtifactResponse`, `RequestNewSkillRequest`, `NoteInput`, `SkillDefinition`.

---

## Dev Workflow

### Starting a coding session:
```bash
# Terminal 1 — Plugin (auto-rebuilds on save, Obsidian hot-reloads instantly)
cd learning-os-plugin && npm run dev

# Terminal 2 — Backend (only needed for AI generation)
cd learning-os-backend && source .venv/bin/activate && python3 main.py
```

### Opening the dashboard in Obsidian:
- Click the 🧠 brain icon in the left ribbon, OR
- `Cmd+P` → `Open Learning OS Dashboard`

### Build for production (no hot-reload):
```bash
cd learning-os-plugin && npm run build
```

---

## Critical Technical Gotchas (Lessons Learned)

| # | Rule | Why |
|---|---|---|
| 1 | esbuild outputs to `plugins/learning-os-plugin/` not `plugins/learning-os/` | Obsidian loads from the `dir` recorded in its manifest registry, not from the plugin ID folder name |
| 2 | `tsconfig.json` must have `"jsx": "react-jsx"` (not `"react"`) | React 19 requires the automatic JSX runtime; legacy mode causes silent breakage |
| 3 | `esbuild.config.mjs` must have `jsx: "automatic"` + `jsxImportSource: "react"` | esbuild doesn't inherit tsconfig JSX settings for `.tsx` files |
| 4 | Never call `detachLeavesOfType(VIEW_TYPE_LEARNING_OS)` in `onunload()` | Hot-reload calls `onunload()` on every save — doing this kills the tab and requires vault switching to restore it |
| 5 | Never edit `workspace.json` while Obsidian is running | Obsidian overwrites it on quit. Fix stale views with `detachLeavesOfType()` in `onunload()` instead |
| 6 | `main.ts` uses `React.createElement()` not JSX | It's a `.ts` file not `.tsx` — esbuild won't process JSX syntax in `.ts` |
| 7 | The Obsidian `App` object must be threaded into React via context | Components that need vault access call `useObsidianApp()` from `AppContext.ts` |
| 8 | All API keys travel as request headers, never stored server-side | BYOK pattern — backend reads `X-API-Key` + `X-API-Base` from each request |

---

## File Map

```
obsidean_workflow/
├── AGENT.md                            ← Project overview (keep updated)
├── test-vault/                         ← Obsidian test vault
│   ├── Calculus/
│   │   └── _subject-context.md
│   └── .obsidian/
│       └── plugins/
│           ├── learning-os-plugin/     ← BUILT OUTPUT goes here (Obsidian loads this)
│           └── hot-reload/             ← Auto-reloads plugin on main.js change
├── learning-os-plugin/                 ← Plugin SOURCE code
│   ├── esbuild.config.mjs              ← Build config (outfile → learning-os-plugin/)
│   ├── tsconfig.json                   ← jsx: "react-jsx", no outDir
│   ├── package.json                    ← React 19, openai, obsidian types
│   └── src/
│       ├── main.ts                     ← Plugin entry, view registration, ribbon
│       ├── api/backendClient.ts        ← HTTP client for FastAPI
│       ├── settings/
│       │   ├── SettingsTab.ts          ← Obsidian settings panel
│       │   └── defaultSettings.ts     ← LearningOSSettings interface + defaults
│       └── ui/
│           ├── App.tsx                 ← Root app: context provider + 7-page nav
│           ├── AppContext.ts           ← ObsidianAppContext + useObsidianApp()
│           ├── GeneratePage.tsx        ← Artifact Creator (3-step, fully functional)
│           └── useVaultStats.ts        ← Hook for reading vault data (unused, superseded by inline useEffect in HomePage)
├── learning-os-backend/                ← Python FastAPI server
│   ├── main.py                         ← Routes: /health, /artifacts/generate, /skills/request_new
│   ├── requirements.txt
│   ├── .venv/                          ← Python virtualenv (run: source .venv/bin/activate)
│   └── src/
│       ├── llm/client.py               ← AsyncOpenAI client from request headers
│       ├── models/schemas.py           ← Pydantic request/response models
│       └── skills/prompts.py           ← Skill modifiers + artifact type instructions
└── learning-os-blueprint/
    └── docs/
        ├── 00-system-architecture.md
        ├── 01-frontend-blueprint.md    ← Updated with actual structure
        ├── 02-backend-blueprint.md
        ├── 03-data-schema.md
        ├── 04-skill-evolution-loop.md
        └── 05-dev-session-notes.md     ← All bugs, lessons, debugging commands
```

---

## What's NOT Built Yet (Planned)

### Plugin pages (currently mock/static UI):
- **Chat page** — wire to `POST /skills/request_new`; show real LLM responses; skill creation confirmation flow
- **Skills Lab** — persist skill on/off state to vault; load active skills from vault into GeneratePage
- **Progression Map** — read frontmatter `mastery` field from notes; generate/update `.canvas` file
- **Subjects page** — real subject switcher that updates `activeSubjectPath` setting; read `_subject-context.md`

### Vault data layer:
- `vault/fileWriter.ts` — safe `app.vault.modify()` wrappers
- `vault/metadataParser.ts` — read/write YAML frontmatter (mastery scores, tags, last-reviewed date)
- `canvas/canvasManager.ts` — generate `.canvas` JSON from topic → mastery data

### Backend:
- Feynman evaluator endpoint (`POST /feynman/evaluate`) — grade student explanations
- Skill feedback loop (`POST /skills/feedback`) — collect ratings, promote unrefined → mastered
- Multi-agent skill builder (LangGraph Researcher → Reasoner pipeline)
- Spaced repetition scheduler (track due dates, surface review reminders)

### Cross-cutting:
- Mastery tracking: frontmatter `mastery: 0-100` written back after each Feynman evaluation
- Subject context file (`_subject-context.md`) — auto-included as context for all generation
- Artifact history: index of generated artifacts per subject
