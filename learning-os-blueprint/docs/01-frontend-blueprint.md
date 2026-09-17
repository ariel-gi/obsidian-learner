# Frontend Blueprint: Obsidian Plugin

> **Implementation Status (2026-09-09):** The dashboard UI has been fully scaffolded as static mock UI. All 6 pages render with placeholder data. No backend calls are wired yet. See `05-dev-session-notes.md` for build setup, bug history, and critical config notes.

## 1. Overview
The Obsidian plugin serves as the primary user interface and file interaction layer. It connects to the local Python FastAPI server to offload heavy AI operations.

The plugin opens as a **full-page center-pane tab** (not a sidebar), triggered by the 🧠 brain icon in the left ribbon or via `Cmd+P → Open Learning OS Dashboard`.

## 2. Tech Stack
- **Framework:** Obsidian Plugin API
- **Language:** TypeScript
- **UI Libraries:** React (or Svelte, depending on developer preference, but React is common via `react`, `react-dom` and Obsidian's `ItemView`)
- **Styling:** CSS (Obsidian's native variables + custom classes)
- **Bundler:** esbuild (standard for Obsidian plugins)

## 3. Directory Structure (Actual — as of 2026-09-09)
```text
learning-os-plugin/
├── main.ts                 # Plugin entry point (registers view, ribbon, command palette)
├── manifest.json           # Plugin metadata (ID: "learning-os")
├── styles.css              # Minimal CSS (scrollbars, focus rings, transitions)
├── esbuild.config.mjs      # Build — outputs to test-vault/.obsidian/plugins/learning-os-plugin/
├── tsconfig.json           # jsx: "react-jsx" (React 19 compatible)
└── src/
    ├── main.ts             # (same as root — esbuild entry point)
    ├── settings/
    │   ├── SettingsTab.ts  # Obsidian settings UI ✅ built
    │   └── defaultSettings.ts # Default config ✅ built
    ├── api/
    │   └── backendClient.ts # HTTP client for FastAPI ✅ built (not yet called from UI)
    ├── ui/
    │   └── App.tsx          # Entire dashboard — all 6 pages self-contained ✅ built
    ├── canvas/              # ⬜ planned: canvasManager.ts
    ├── vault/               # ⬜ planned: fileWriter.ts, metadataParser.ts
    └── types/               # ⬜ planned: index.ts (TypeScript interfaces)
```

## 4. Core Modules & Responsibilities

### 4.1. Settings Management (`SettingsTab.ts`)
- **Fields Needed:**
  - `pythonServerUrl`: (Default `http://localhost:8000`)
  - `apiEndpoint`: Custom OpenAI compatible endpoint URL (e.g., AIClient2API)
  - `apiKey`: The authentication key.
  - `activeSubject`: (Optional) Path to the currently active subject folder.
- **Action:** On save, update `backendClient.ts` to use these headers/URLs.

### 4.2. API Client (`backendClient.ts`)
- Responsible for all HTTP communication with the Python backend.
- Must cleanly handle connection errors (e.g., if the Python server isn't running) and display an Obsidian Notice to the user.
- **Endpoints to consume:** `/chat`, `/generate_artifact`, `/submit_feedback`, `/evaluate_feynman`.

### 4.3. The Preferences Chatbot View (`SidebarView.ts` & `ChatSidebar.tsx`)
- Registers an Obsidian custom view in the right or left sidebar.
- Displays a chat interface.
- Handles user input -> sends to `backendClient.chat(message)` -> renders streaming or static response.
- Contains the `SkillToggles` component to quickly enable/disable preferences (reading state from `/.obsidian/learning-os-data/skills.json`).

### 4.4. Vault Interaction Layer (`fileWriter.ts` & `metadataParser.ts`)
- **Rule:** The Python backend NEVER writes to files directly. It returns data payloads, and this layer executes the write.
- **Functions:**
  - `updateFrontmatter(file: TFile, key: string, value: any)`
  - `appendWidget(file: TFile, widgetId: string, props: any)`: Injects a unique identifier that the MarkdownPostProcessor will later replace with a React component.
  - `readSubjectContext(folderPath: string)`: Finds `_subject-context.md` and returns contents.

### 4.5. Canvas Generation (`canvasManager.ts`)
- Understands the Obsidian Canvas JSON spec (`.canvas`).
- **Function:** `generateProgressionMap(subjectPath: string)`
  - Scans all files in `subjectPath`.
  - Reads YAML frontmatter `mastery_level`.
  - Generates nodes for each file.
  - Generates edges (arrows) based on links between files or pre-defined prerequisites.
  - Colors nodes (e.g., `1 = red`, `2 = yellow`, `3 = green`, `4 = cyan`, `5 = magenta`, `6 = gray` - based on Obsidian's internal color system).
  - Uses `app.vault.create()` or `modify()` to save the `.canvas` file.

### 4.6. Markdown Post Processing (Widgets)
- Obsidian allows plugins to hook into the markdown rendering pipeline.
- When Obsidian renders a note, the plugin looks for specific code blocks (e.g., ````feynman-evaluator ... ````).
- The plugin replaces that code block with a live React component (`FeynmanEvaluator.tsx`), enabling rich UI interaction inside static notes.

## 5. Development Steps (Sequential)
1. Initialize basic Obsidian plugin template.
2. Build the Settings Tab and store configuration.
3. Build the Sidebar View structure (empty react component).
4. Implement `backendClient.ts` and test connection to a dummy server.
5. Build the Chat UI and connect it to the client.
6. Implement `metadataParser` to read/write YAML properties.
7. Implement `canvasManager` basic generation logic.
8. Build Markdown Post Processors for interactive widgets.
