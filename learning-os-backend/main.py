"""
Learning OS Backend — FastAPI server
Handles artifact generation and skill requests for the Obsidian plugin.

Run:
    cd learning-os-backend
    python main.py
"""

import re
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.models.schemas import (
    GenerateArtifactRequest,
    GenerateArtifactResponse,
    RequestNewSkillRequest,
)
from src.llm.client import get_llm_client
from src.skills.prompts import build_system_prompt
from src.routes.resources import router as resources_router

app = FastAPI(title="Learning OS Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resources_router)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Verify connection from Obsidian plugin."""
    return {"status": "ok", "message": "Learning OS Backend is running."}


# ── Artifact generation ───────────────────────────────────────────────────────

@app.post("/artifacts/generate", response_model=GenerateArtifactResponse)
async def generate_artifact(request: Request, payload: GenerateArtifactRequest):
    """
    Generates a learning artifact using the selected vault notes as context.

    Flow:
    1. Build system prompt from artifact_type + active_skills
    2. Assemble user message from topic + note contents
    3. Call LLM (OpenAI-compatible endpoint from plugin headers)
    4. Return title + markdown content
    """
    client = get_llm_client(request)

    # Build the system prompt (composes skill modifiers on top of artifact instructions)
    system_prompt = build_system_prompt(payload.artifact_type, payload.active_skills)

    # Build the note context block
    if payload.notes:
        note_context = "\n\n---\n\n".join(
            f"### Note: {note.path}\n\n{note.content}"
            for note in payload.notes
        )
        context_block = f"VAULT NOTES PROVIDED AS CONTEXT:\n\n{note_context}"
    else:
        context_block = "No vault notes were provided. Generate from your general knowledge."

    # Build the user message
    user_message = (
        f"TOPIC: {payload.topic}\n\n"
        f"ARTIFACT TYPE: {payload.artifact_type}\n\n"
        f"{context_block}\n\n"
        f"Now generate the {payload.artifact_type.replace('_', ' ')} for the topic above. "
        f"Output only the artifact — no intro text."
    )

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",  # Best quality/price; overridden by pooling endpoint
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            temperature=0.7,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM call failed: {str(e)}")

    content = response.choices[0].message.content or ""

    # Derive a clean title from the topic
    title = _derive_title(payload.topic, payload.artifact_type)

    return GenerateArtifactResponse(title=title, content=content)


# ── New skill request ─────────────────────────────────────────────────────────

@app.post("/skills/request_new")
async def request_new_skill(request: Request, payload: RequestNewSkillRequest):
    """
    Uses the LLM to interpret the user's vague skill request and return
    a structured skill definition. (Multi-agent loop placeholder.)
    """
    client = get_llm_client(request)

    system_prompt = (
        "You are a meta-learning engineer. The user wants to add a new teaching style "
        "to their personal AI tutor. Based on their vague request, define:\n"
        "1. A short skill name (3-5 words)\n"
        "2. A one-sentence description\n"
        "3. A system prompt modifier (2-4 sentences) that would make an LLM apply this style\n\n"
        "Format your response exactly as:\n"
        "NAME: ...\nDESCRIPTION: ...\nSYSTEM_PROMPT: ..."
    )

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"User request: {payload.prompt}"},
            ],
            temperature=0.8,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM call failed: {str(e)}")

    raw = response.choices[0].message.content or ""

    return {
        "status": "success",
        "raw_definition": raw,
        "message": "Skill definition generated. Review and confirm to add it.",
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _derive_title(topic: str, artifact_type: str) -> str:
    """Generates a clean filename-safe title from the topic and artifact type."""
    type_labels = {
        "study_note": "Study Note",
        "flashcards":  "Flashcards",
        "summary":     "Summary",
        "feynman":     "Feynman Sheet",
        "practice":    "Practice Problems",
    }
    label = type_labels.get(artifact_type, artifact_type.replace("_", " ").title())
    clean = re.sub(r"[^\w\s-]", "", topic).strip()
    return f"{clean} — {label}"


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
