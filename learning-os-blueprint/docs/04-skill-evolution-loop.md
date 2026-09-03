# Workflow Blueprint: Skill Evolution Loop

## 1. Goal
To autonomously transform a vague user request (e.g., "Make my notes more visual") into a codified, reusable "Skill" (`.json`) that can be toggled on/off.

## 2. The Multi-Agent Pipeline (Backend)

The loop is orchestrated by `langgraph` in the Python FastAPI server. It uses a state machine to track the creation and refinement of the skill.

### Phase 1: Request & Ideation
1. **Trigger:** Obsidian sends a `POST /skills/request_new` with the user prompt.
2. **Orchestrator Agent:** Receives the prompt and initializes a new Skill State.
3. **Researcher Sub-Agent:**
   - **Tools:** DuckDuckGo Search, URL Reader (BeautifulSoup).
   - **Task:** "Find the best practices for implementing [User Request] inside Obsidian markdown."
   - **Example:** User wants "interactive quizzes." Researcher finds that Obsidian plugins or specific HTML/JS code blocks can render quizzes.
4. **Reasoner Sub-Agent:**
   - **Task:** "Take the Researcher's findings and write a highly specific LLM System Prompt that will force future generations to output this format."

### Phase 2: Unrefined Creation
5. **JSON Generation:** The Reasoner outputs a `SkillDefinition` object.
   - `status: "unrefined"`
   - `system_prompt: "..."`
6. **Return to Frontend:** Python returns the JSON. Obsidian saves it to `/.obsidian/learning-os-data/skills/`. The UI adds a new toggle switch.

### Phase 3: The Feedback Loop (The "Micro-Interactions")
7. **Application:** The user generates a new learning artifact (e.g., `Integrals.md`) with the *Unrefined Skill* toggled ON.
8. **Widget Injection:** The Obsidian plugin notices the skill is "unrefined" and automatically injects a `FeedbackWidget.tsx` block at the bottom of the generated note.
   - UI: "Did this new visual skill work? [1-5 Stars] [Optional text]"
9. **Feedback Submission:** User clicks 3 stars and types "The mermaid graph was too small."
10. **Obsidian -> Python:** Sends `POST /skills/submit_feedback`.
    - Payload: `{ skill_id, rating: 3, text: "too small", context: "...the generated graph..." }`

### Phase 4: Refinement & Mastery
11. **Refinement Agent:**
    - Analyzes the feedback against the original `system_prompt`.
    - Rewrites the `system_prompt`. (e.g., Adds: "Ensure all mermaid graphs specify `%%{init: {'theme': 'dark'}}%%` and use large node sizes.")
    - Updates internal JSON.
12. **Mastery Check:**
    - If `average_rating > 4.5` over `iterations > 3`, the status changes from `"unrefined"` to `"mastered"`.
    - If Mastered, Obsidian stops injecting the feedback widget into future notes.

## 3. Implementation Steps for the Loop
1. Setup `langgraph` (or equivalent) in the Python backend to handle the Researcher -> Reasoner flow.
2. Define the Pydantic schema for the Skill object.
3. Build the `FeedbackWidget` React component in the Obsidian plugin.
4. Create the `processFrontMatter` logic in Obsidian to inject the feedback block only if `status === 'unrefined'`.
5. Implement the Refinement Agent logic to handle incoming feedback and mutate the skill's system prompt.
