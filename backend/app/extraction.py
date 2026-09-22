import base64
import json
from pathlib import Path

import httpx

from .config import settings


FIELDS = ("owner_name", "survey_number", "khata_number", "area", "village", "district")


def _fallback(filename: str, language: str) -> dict:
    stem = Path(filename).stem.replace("_", " ").title()
    return {
        "owner_name": "Pending manual confirmation",
        "survey_number": "SUR-UNKNOWN",
        "khata_number": "KHA-UNKNOWN",
        "area": "0.00 acres",
        "village": "Unknown Village",
        "district": "Unknown District",
        "total_area_acres": 0.0,
        "sub_plot_areas": [],
        "geometry": None,
        "confidences": {
            field: {"value": value, "confidence": 0.45, "source_text": f"{stem} ({language})"}
            for field, value in {
                "owner_name": "Pending manual confirmation",
                "survey_number": "SUR-UNKNOWN",
                "khata_number": "KHA-UNKNOWN",
                "area": "0.00 acres",
                "village": "Unknown Village",
                "district": "Unknown District",
            }.items()
        },
    }


async def extract_document(path: Path, language: str) -> dict:
    if not settings.qwen_api_url:
        return _fallback(path.name, language)

    payload = {
        "model": settings.qwen_model,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": "Extract this land record as strict JSON with owner_name, survey_number, khata_number, area, village, district, total_area_acres, sub_plot_areas, geometry, confidences."},
                {"type": "image_url", "image_url": {"url": f"data:application/octet-stream;base64,{base64.b64encode(path.read_bytes()).decode()}"}},
            ],
        }],
        "temperature": 0,
    }
    headers = {"Authorization": f"Bearer {settings.qwen_api_key}"} if settings.qwen_api_key else {}
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(settings.qwen_api_url, json=payload, headers=headers)
        response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    if isinstance(content, list):
        content = "".join(part.get("text", "") for part in content)
    return json.loads(content)
