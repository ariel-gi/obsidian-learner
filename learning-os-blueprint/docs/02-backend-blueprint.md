# Backend Blueprint: Python FastAPI Server

## 1. Overview
The Python server acts as the heavy intelligence layer. It receives contexts and queries from the Obsidian plugin, orchestrates multi-agent tasks, generates artifacts, and evolves skills based on feedback.

## 2. Tech Stack
- **Framework:** FastAPI (High performance, async, built-in Swagger UI)
- **Server:** Uvicorn
- **LLM SDK/Routing:** `openai` (Official python package configured to use custom base URLs for compatibility with AIClient2API/LiteLLM)
- **Agent Orchestration:** `langchain`, `langgraph`, or `crewai` (TBD based on complexity. `langgraph` offers excellent state management for loops).
- **Web Search/Research:** `tavily-python` or standard `beautifulsoup4` + `requests` for sub-agent research.

## 3. Directory Structure (Proposed)
```text
learning-os-backend/
├── main.py                 # FastAPI application & route definitions
├── requirements.txt        # Python dependencies
├── src/
│   ├── api/
│   │   ├── routes_chat.py      # Chatbot endpoints
│   │   ├── routes_artifact.py  # Generation endpoints
│   │   └── routes_skills.py    # Feedback & skill evolution endpoints
│   ├── agents/
│   │   ├── orchestrator.py     # Main routing agent (decides which sub-agent to call)
│   │   ├── researcher.py       # Web search & documentation reading sub-agent
│   │   ├── reasoning.py        # Logic and prompt formulation sub-agent
│   │   └── evaluator.py        # Grades Feynman technique / tests
│   ├── llm/
│   │   └── client.py           # Configures the OpenAI client using dynamic headers/URLs
│   ├── models/
│   │   └── schemas.py          # Pydantic models for API validation
│   └── utils/
│       ├── file_parsers.py     # Utilities for understanding Obsidian payloads
│       └── prompt_templates.py # Base templates for generation
```

## 4. Core Modules & Responsibilities

### 4.1. LLM Client Configurator (`client.py`)
- Must dynamically instantiate the LLM client based on incoming request headers.
- Since the user configs their API key and Endpoint in Obsidian, every HTTP request to FastAPI will include:
  - `X-API-Key`: The API key.
  - `X-API-Base`: The custom endpoint URL.
- The Python server reads these and initializes:
  ```python
  from openai import AsyncOpenAI
  client = AsyncOpenAI(api_key=key, base_url=base)
  ```

### 4.2. Pydantic Schemas (`schemas.py`)
Ensure robust type checking between Obsidian and Python.
- `GenerateArtifactRequest`:
  - `subject_context`: str (The contents of `_subject-context.md`)
  - `topic`: str
  - `active_skills`: List[str] (e.g., ["metaphor_engine", "visual_bias"])
  - `user_prompt`: str
- `SkillFeedbackRequest`:
  - `skill_id`: str
  - `rating`: int (1-5)
  - `text_feedback`: Optional[str]
  - `context`: str (What the skill generated)

### 4.3. Multi-Agent System (`agents/`)
This is the core value proposition of the backend.

#### The Skill Evolution Loop (Pre-dedicated Agent)
Triggered via `/evolve-skill` endpoint.
1. **User Request:** Obsidian sends: "Create a skill that adds visual math models."
2. **Orchestrator:** Parses intent. Identifies this is a *new skill creation* request.
3. **Researcher Sub-Agent:**
   - Prompted to find best practices for rendering math in Obsidian.
   - Discovers `MathJax` (native) or `mermaid.js` or `JSXGraphs`.
   - Returns technical constraints.
4. **Reasoning Sub-Agent:**
   - Takes Researcher's output and crafts a robust *System Prompt* for the LLM.
   - Defines the JSON structure required for Obsidian widgets.
5. **Output:** Python returns a completed `SkillDefinition` payload (Status: Unrefined) to Obsidian, which saves it to `.json`.

#### The Generation Loop
Triggered via `/generate_artifact` endpoint.
1. Receives topic, `_subject-context.md`, and list of `active_skills`.
2. Loads the system prompts associated with the `active_skills` (e.g., if Socratic Mode is active, injects the rule: "Do not provide direct answers...").
3. Makes the LLM call using the dynamically configured `AsyncOpenAI` client.
4. Returns formatted Markdown string to Obsidian.

### 4.4. The Evaluator Agent (`evaluator.py`)
- Specific endpoint for the "Feynman Technique Evaluator" widget.
- Takes the `student_explanation` and compares it against the `ground_truth_concept`.
- Returns JSON: `{"score": 80, "gaps": ["Forgot to mention limit approach to 0"], "encouragement": "Good start!"}`.

## 5. API Route Definitions (FastAPI)

- `GET /health` -> Returns `{"status": "ok"}`
- `POST /chat/preferences` -> Handles general chatbot interaction.
- `POST /artifacts/generate` -> Creates learning materials.
- `POST /skills/request_new` -> Triggers Researcher + Reasoner agents.
- `POST /skills/submit_feedback` -> Evaluates if a skill should move from "Unrefined" to "Mastered".
- `POST /evaluate/feynman` -> Grades student explanations.

## 6. Development Steps (Sequential)
1. Initialize Python environment (`venv`, `fastapi`, `uvicorn`, `openai`, `pydantic`).
2. Build basic `main.py` with the `/health` endpoint to test Obsidian connectivity.
3. Implement `client.py` to securely read API keys/Endpoints from request headers.
4. Define Pydantic schemas in `schemas.py` to match Obsidian's data structures.
5. Build the `/artifacts/generate` route (basic RAG utilizing the `_subject-context.md`).
6. Integrate the Agent framework (e.g., LangGraph) and build the Researcher agent.
7. Build the `skills/request_new` pipeline (the complex evolution loop).
