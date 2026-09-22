from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    document_id: int | None = None


class VerificationRequest(BaseModel):
    verifiedBy: str = Field(min_length=1, max_length=160)
    correctedFields: dict[str, str] = {}
    remarks: str = ""


class ChatResponse(BaseModel):
    answer: str
    sources: list[str] = []
    confidence: float
