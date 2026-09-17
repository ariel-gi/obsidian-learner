"""
Skill system prompt definitions.
Each skill adds a modifier to the system prompt sent to the LLM.
Skills are composable — multiple can be active at once.
"""

# ── Per-skill prompt modifiers ────────────────────────────────────────────────

SKILL_MODIFIERS: dict[str, str] = {
    "socratic": (
        "Use the Socratic method: instead of directly stating facts, guide the student "
        "with probing questions throughout the note. After each key concept, add a "
        "'💭 Think About It:' block with 1-2 questions that prompt deeper reflection."
    ),
    "metaphor": (
        "Use vivid real-world analogies and metaphors to explain abstract concepts. "
        "Relate ideas to everyday experiences (sports, cooking, construction, etc.). "
        "Add a '🔗 Analogy:' callout for each core concept."
    ),
    "visual_bias": (
        "Heavily prefer Mermaid diagrams, ASCII tables, and structured layouts over "
        "plain prose. Every major relationship or process should have a visual representation. "
        "Use Obsidian Mermaid syntax (```mermaid blocks)."
    ),
    "spaced_rep": (
        "At the end of the artifact, add a '🃏 Spaced Repetition' section with "
        "5-10 Anki-style flashcard pairs formatted as:\n"
        "Q: [question]\nA: [answer]\n\n"
        "Cards should cover the most important concepts from the artifact."
    ),
    "feynman": (
        "After each major section, add a '✏️ Feynman Check' block where you ask the "
        "student to explain the concept back in their own words using a simple prompt. "
        "Include a 'Common Misconception:' warning for each concept."
    ),
}

# ── Artifact type instructions ────────────────────────────────────────────────

ARTIFACT_TYPE_INSTRUCTIONS: dict[str, str] = {
    "study_note": (
        "Generate a comprehensive, well-structured study note in Obsidian Markdown. "
        "Include: a brief overview, key concepts with clear definitions, worked examples, "
        "and a summary. Use headers (##, ###), bullet points, and callouts (> [!note])."
    ),
    "flashcards": (
        "Generate a set of 15-25 Anki-style flashcard pairs. Format each as:\n"
        "---\n**Q:** [question]\n**A:** [answer]\n\n"
        "Cover definitions, key formulas, and conceptual distinctions. "
        "Order from foundational to advanced."
    ),
    "summary": (
        "Generate a concise TL;DR summary (max 400 words). Use bullet points. "
        "Structure: 1) Core idea in one sentence, 2) 3-5 key takeaways, "
        "3) What to review next. Be dense and information-rich."
    ),
    "feynman": (
        "Generate a Feynman teaching sheet. Structure:\n"
        "1. Explain the concept as if teaching a 10-year-old (simple language only)\n"
        "2. Identify the 3 most commonly confused or misunderstood parts\n"
        "3. Add a self-test section where the student explains it back\n"
        "4. Link to prerequisite concepts they must understand first."
    ),
    "practice": (
        "Generate 8-12 practice problems with full worked solutions. "
        "Include: 2-3 warm-up problems, 4-6 standard problems, 2-3 challenge problems. "
        "For each problem: show the full solution step-by-step with explanations. "
        "Use LaTeX for math ($$...$$)."
    ),
}


def build_system_prompt(artifact_type: str, active_skills: list[str]) -> str:
    """
    Compose the final system prompt from artifact type instructions
    and any active skill modifiers.
    """
    base = (
        "You are a personalized learning assistant embedded in Obsidian. "
        "Your output is always valid Obsidian Markdown. "
        "Never add preamble like 'Here is your note' — output only the artifact itself.\n\n"
    )

    type_instruction = ARTIFACT_TYPE_INSTRUCTIONS.get(
        artifact_type,
        ARTIFACT_TYPE_INSTRUCTIONS["study_note"]
    )

    skill_mods = [
        f"• {SKILL_MODIFIERS[s]}"
        for s in active_skills
        if s in SKILL_MODIFIERS
    ]

    prompt = base + f"ARTIFACT TYPE INSTRUCTIONS:\n{type_instruction}"

    if skill_mods:
        prompt += "\n\nACTIVE SKILL MODIFIERS (apply all of these):\n" + "\n".join(skill_mods)

    return prompt
