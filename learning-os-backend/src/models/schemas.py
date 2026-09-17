from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ── Request schemas (frontend → backend) ──────────────────────────────────────

class NoteInput(BaseModel):
    """A single vault note passed as context for generation."""
    path: str = Field(..., description="Vault-relative path, e.g. 'Calculus/Lecture1.md'")
    content: str = Field(..., description="Raw markdown content of the note.")


class GenerateArtifactRequest(BaseModel):
    """Payload sent by the Artifact Creator page."""
    topic: str = Field(..., description="The topic or focus for the artifact.")
    notes: List[NoteInput] = Field(default_factory=list, description="Selected vault notes to use as context.")
    active_skills: List[str] = Field(default_factory=list, description="Active skill IDs to apply (e.g. 'socratic', 'metaphor').")
    artifact_type: str = Field(default="study_note", description="One of: study_note | flashcards | summary | feynman | practice.")


class RequestNewSkillRequest(BaseModel):
    """Payload for requesting a new AI skill via Chat."""
    prompt: str = Field(..., description="The user's vague request, e.g. 'Make notes more visual'.")


class SkillFeedbackRequest(BaseModel):
    """Post-artifact feedback on a skill."""
    skill_id: str
    rating: int = Field(..., ge=1, le=5)
    text_feedback: Optional[str] = None
    context: str = Field(..., description="The generated snippet the skill produced.")


class EvaluateFeynmanRequest(BaseModel):
    concept: str
    student_explanation: str
    strictness: str = "high"


# ── Response schemas (backend → frontend) ─────────────────────────────────────

class GenerateArtifactResponse(BaseModel):
    title: str
    content: str


# ── Internal skill definition ─────────────────────────────────────────────────

class SkillDefinition(BaseModel):
    skill_id: str
    name: str
    description: str
    status: str = Field(..., description="'unrefined' or 'mastered'")
    is_active: bool = True
    system_prompt: str
    feedback_score: float = 0.0
    iterations: int = 0


# ── Resource ingestion ────────────────────────────────────────────────────────

class IngestResourceRequest(BaseModel):
    """Payload sent by the plugin when the student uploads a file to a subject."""
    subject_name: str = Field(..., description="Human-readable subject name, e.g. 'Calculus'.")
    file_name: str    = Field(..., description="Original file name, e.g. 'lecture3.pdf'.")
    mime_type: str    = Field(..., description="MIME type, e.g. 'application/pdf' | 'image/png' | 'text/plain'.")
    content_base64: str = Field(..., description="Base64-encoded file bytes.")


class IngestResourceResponse(BaseModel):
    """Returned to the plugin after a successful ingest. Plugin writes index_entry to vault."""
    ok: bool
    file_name: str
    summary: str
    description: str
    index_entry: str = Field(..., description="Formatted markdown block ready to append to _resource-index.md.")

