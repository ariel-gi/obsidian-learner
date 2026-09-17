"""
Learning OS — Resource Ingestion Service

Handles the multimodal LLM call that analyzes an uploaded file and produces
a structured index entry (summary + dense description) for the resource index.

The backend stays stateless: it returns the formatted markdown entry to the
plugin, which writes it into the vault using Obsidian's own file APIs.
"""

import base64
import json
import re
from datetime import date
from fastapi import HTTPException
from openai import AsyncOpenAI

# ── MIME type helpers ─────────────────────────────────────────────────────────

# MIME types that can be sent as base64 image_url parts in the multimodal message
_IMAGE_MIMES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
# MIME types that OpenAI/Gemini accept as document data URIs
_DOC_MIMES   = {"application/pdf"}
# MIME types we decode as plain text and inject into the message
_TEXT_MIMES  = {"text/plain", "text/markdown", "text/x-markdown"}


def _is_image(mime: str) -> bool:
    return mime.lower() in _IMAGE_MIMES

def _is_doc(mime: str) -> bool:
    return mime.lower() in _DOC_MIMES

def _is_text(mime: str) -> bool:
    return mime.lower() in _TEXT_MIMES


# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an academic librarian cataloguing student study materials.
You will receive a file (document, image, or text).

Return ONLY a valid JSON object — no markdown fences, no extra text.
The object must have exactly two string fields:

{
  "summary": "<one sentence, max 25 words: topic and type of document>",
  "description": "<3–5 sentences of dense factual description: structure, key concepts, diagrams, formulas, visual features, depth of coverage, and any notable details>"
}
"""

# ── Core ingestion function ───────────────────────────────────────────────────

async def run_ingestion(
    client: AsyncOpenAI,
    file_name: str,
    mime_type: str,
    content_base64: str,
    model: str = "gpt-4o",
) -> dict:
    """
    Calls the multimodal LLM to analyze the uploaded file.

    Returns a dict with keys: summary, description
    Raises HTTPException on LLM failure or malformed response.
    """
    mime_lower = mime_type.lower()

    # Build the user content part(s) based on file type
    if _is_image(mime_lower):
        # Standard OpenAI vision: image_url with data URI
        user_content = [
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_lower};base64,{content_base64}",
                    "detail": "high",
                },
            },
            {
                "type": "text",
                "text": f"File name: {file_name}\n\nAnalyze this image and return the JSON as instructed.",
            },
        ]

    elif _is_doc(mime_lower):
        # PDFs: same data URI approach — supported by GPT-4o and Gemini
        user_content = [
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_lower};base64,{content_base64}",
                },
            },
            {
                "type": "text",
                "text": f"File name: {file_name}\n\nAnalyze this document and return the JSON as instructed.",
            },
        ]

    elif _is_text(mime_lower):
        # Decode bytes to UTF-8 string and inject as plain text
        try:
            raw_text = base64.b64decode(content_base64).decode("utf-8", errors="replace")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not decode text file: {e}")

        # Truncate to ~12 000 chars to stay within context limits
        if len(raw_text) > 12_000:
            raw_text = raw_text[:12_000] + "\n\n[... truncated ...]"

        user_content = [
            {
                "type": "text",
                "text": (
                    f"File name: {file_name}\n\n"
                    f"--- FILE CONTENT ---\n{raw_text}\n--- END ---\n\n"
                    f"Analyze this text file and return the JSON as instructed."
                ),
            }
        ]

    else:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {mime_type}. "
                   f"Accepted: images (png/jpg/webp/gif), PDF, plain text, markdown.",
        )

    # ── Call the LLM ─────────────────────────────────────────────────────────
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_content},
            ],
            temperature=0.2,  # Low temperature — we want accurate descriptions
            max_tokens=512,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM call failed during ingestion: {e}")

    raw = (response.choices[0].message.content or "").strip()

    # Strip markdown code fences if the model wrapped the JSON
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
        summary     = str(parsed.get("summary", "")).strip()
        description = str(parsed.get("description", "")).strip()
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail=f"LLM returned non-JSON response during ingestion: {raw[:300]}",
        )

    if not summary or not description:
        raise HTTPException(
            status_code=502,
            detail="LLM response missing 'summary' or 'description' fields.",
        )

    return {"summary": summary, "description": description}


# ── Index entry formatter ─────────────────────────────────────────────────────

def format_index_entry(file_name: str, summary: str, description: str) -> str:
    """
    Formats the markdown block to append to _resource-index.md.

    Example output:
        ## lecture3.pdf
        **Added:** 2026-09-16
        **Summary:** Lecture notes on limits and continuity...
        **Description:** Dense formal treatment of real-valued limits...

        ---
    """
    today = date.today().isoformat()
    return (
        f"\n## {file_name}\n"
        f"**Added:** {today}  \n"
        f"**Summary:** {summary}  \n"
        f"**Description:** {description}\n\n"
        f"---\n"
    )


def build_index_header(subject_name: str) -> str:
    """Returns the header block written at the top of a new _resource-index.md."""
    return (
        f"# Resource Index — {subject_name}\n"
        f"_Auto-generated. Do not edit manually._\n\n"
        f"---\n"
    )
