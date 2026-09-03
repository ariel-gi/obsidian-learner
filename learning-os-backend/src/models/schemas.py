from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# --- Frontend to Backend Request Models ---

class GenerateArtifactRequest(BaseModel):
    subject_context: str = Field(..., description="The contents of the _subject-context.md file.")
    topic: str = Field(..., description="The topic to generate notes for.")
    active_skills: List[str] = Field(default_factory=list, description="List of active skill IDs to apply.")
    user_prompt: str = Field(..., description="The user's specific request for this artifact.")

class SkillFeedbackRequest(BaseModel):
    skill_id: str = Field(..., description="The unique ID of the skill.")
    rating: int = Field(..., ge=1, le=5, description="User rating from 1 to 5.")
    text_feedback: Optional[str] = Field(None, description="Optional text feedback from the user.")
    context: str = Field(..., description="The generated context/snippet that the skill produced.")

class RequestNewSkillRequest(BaseModel):
    user_prompt: str = Field(..., description="The user's vague request for a new feature (e.g., 'Make it more visual').")

class EvaluateFeynmanRequest(BaseModel):
    concept: str = Field(..., description="The concept being tested.")
    student_explanation: str = Field(..., description="The text the student wrote to explain the concept.")
    strictness: str = Field(default="high", description="How strict the grading should be.")

# --- Backend State/Internal Models ---

class SkillDefinition(BaseModel):
    skill_id: str
    name: str
    description: str
    status: str = Field(..., description="Either 'unrefined' or 'mastered'")
    is_active: bool = True
    system_prompt: str
    feedback_score: float = 0.0
    iterations: int = 0
