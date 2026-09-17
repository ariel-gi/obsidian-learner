"""
Learning OS — Resources Router

Exposes POST /resources/ingest.
The plugin sends the file bytes (base64) + metadata.
The endpoint delegates to the ingestion service, then returns
the formatted markdown index entry for the plugin to write to the vault.
"""

from fastapi import APIRouter, Request
from src.llm.client import get_llm_client
from src.models.schemas import IngestResourceRequest, IngestResourceResponse
from src.services.ingestion import run_ingestion, format_index_entry

router = APIRouter(prefix="/resources", tags=["resources"])


@router.post("/ingest", response_model=IngestResourceResponse)
async def ingest_resource(request: Request, payload: IngestResourceRequest):
    """
    Analyzes an uploaded file using a multimodal LLM and returns a
    structured index entry for the student's subject resource index.

    Flow:
    1. Receive base64 file bytes + metadata from the Obsidian plugin
    2. Route to the correct multimodal message format (image / PDF / text)
    3. Call the vision-capable LLM to produce { summary, description }
    4. Format the markdown index entry block
    5. Return it to the plugin — the plugin writes it to _resource-index.md
    """
    client = get_llm_client(request)

    result = await run_ingestion(
        client=client,
        file_name=payload.file_name,
        mime_type=payload.mime_type,
        content_base64=payload.content_base64,
    )

    index_entry = format_index_entry(
        file_name=payload.file_name,
        summary=result["summary"],
        description=result["description"],
    )

    return IngestResourceResponse(
        ok=True,
        file_name=payload.file_name,
        summary=result["summary"],
        description=result["description"],
        index_entry=index_entry,
    )
