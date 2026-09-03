from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from src.models.schemas import GenerateArtifactRequest, SkillFeedbackRequest, RequestNewSkillRequest, EvaluateFeynmanRequest
from src.llm.client import get_llm_client

app = FastAPI(title="Learning OS Backend", version="1.0.0")

# Allow Obsidian plugin to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Verify connection from Obsidian."""
    return {"status": "ok", "message": "Learning OS Backend is running."}


@app.post("/artifacts/generate")
async def generate_artifact(request: Request, payload: GenerateArtifactRequest):
    """Generates learning materials using the subject context and active skills."""
    client = get_llm_client(request)
    
    # NOTE: This is a placeholder for the actual generation logic.
    # We will inject the active skills' system prompts here later.
    
    response = await client.chat.completions.create(
        model="gpt-3.5-turbo", # Default, can be overridden by pooling
        messages=[
            {"role": "system", "content": "You are a personalized learning agent. Base your teaching on the provided subject context."},
            {"role": "user", "content": f"Subject Context:\n{payload.subject_context}\n\nTopic: {payload.topic}\n\nRequest: {payload.user_prompt}"}
        ]
    )
    
    return {"generated_markdown": response.choices[0].message.content}


@app.post("/skills/request_new")
async def request_new_skill(request: Request, payload: RequestNewSkillRequest):
    """
    Triggers the Multi-Agent Loop (Researcher -> Reasoner) to build a new skill.
    """
    client = get_llm_client(request)
    
    # Placeholder: Will be replaced with LangGraph/Agent logic
    return {
        "status": "processing",
        "message": f"Agents are researching how to implement: {payload.user_prompt}"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
