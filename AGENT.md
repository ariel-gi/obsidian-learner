# Personal Learning OS

## 🎯 Overview
Personal Learning OS is an all-in-one, dynamic, personalized learning environment integrated directly into Obsidian. The system adapts to the user, remembers preferences per subject, tracks progression, and autonomously evolves its capabilities through multi-agent loops.

## 🏗️ Architecture
The system utilizes a split-architecture approach:
*   **Obsidian Frontend (Plugin):** Built with TypeScript and React. It serves as the primary UI/UX, handles all direct file modifications within the Obsidian vault, and manages user settings (API keys/endpoints).
*   **Local Python Backend (FastAPI):** Acts as the orchestration "brain." It runs as a local server, hosts multi-agent workflows, handles LLM routing, and provides endpoints to the frontend for complex AI tasks.
*   **Obsidian Vault:** Serves as the database. It stores knowledge context, progression state in JSON files, and mastery metadata within note YAML Frontmatter.

## 📁 Project Layout

```text
/
├── learning-os-backend/        # FastAPI orchestration server (multi-agent workflows)
├── learning-os-blueprint/      # System architecture and design documentation
└── learning-os-plugin/         # Obsidian TypeScript/React plugin
    ├── src/
    │   ├── api/                # Backend communication client
    │   ├── settings/           # Plugin configuration logic
    │   ├── ui/                 # React UI components (sidebar, widgets)
    │   └── vault/              # Vault file modification handlers
    └── ...                     # Obsidian plugin boilerplate
```

## ✨ Core Features
*   **Progression Mapping:** Uses Obsidian Canvas for visual topic maps, color-coded by mastery level.
*   **Dynamic Preferences:** Configurable pedagogical modes (e.g., Socratic, Metaphor Engine, Visual Bias) without requiring re-prompting.
*   **Agentic Skill Evolution:** An automated loop where user requests trigger agent spawning (Research/Reasoning) to develop, test, and refine new learning tools based on user feedback.
