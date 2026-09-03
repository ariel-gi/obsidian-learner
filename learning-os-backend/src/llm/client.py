from fastapi import Request, HTTPException
from openai import AsyncOpenAI
import os

def get_llm_client(request: Request) -> AsyncOpenAI:
    """
    Extracts the custom API Key and Base URL from the Obsidian Plugin's request headers
    and initializes an AsyncOpenAI client. This allows for seamless integration with
    tools like AIClient2API or LiteLLM.
    """
    api_key = request.headers.get("X-API-Key")
    api_base = request.headers.get("X-API-Base")
    
    # Fallback to env vars if headers are missing (useful for testing outside Obsidian)
    if not api_key:
        api_key = os.environ.get("OPENAI_API_KEY")
    if not api_base:
        api_base = os.environ.get("OPENAI_API_BASE", "https://api.openai.com/v1")

    if not api_key:
        raise HTTPException(
            status_code=401, 
            detail="Missing X-API-Key header. Please configure your API key in the Obsidian Plugin settings."
        )

    return AsyncOpenAI(
        api_key=api_key,
        base_url=api_base
    )
