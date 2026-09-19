"""Endpoint chatbot laporan publik; tidak ada operasi tulis database."""

import logging
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import chat as chat_service

router = APIRouter(tags=["chat"])
logger = logging.getLogger(__name__)


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=500)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    history: list[ChatTurn] = Field(default_factory=list, max_length=6)


class ChatSource(BaseModel):
    id: str
    label: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource]


@router.post("/chat", response_model=ChatResponse)
def ask_chat(request: ChatRequest):
    question = request.message.strip()
    if not question:
        raise HTTPException(422, "Pertanyaan tidak boleh kosong.")
    try:
        return chat_service.answer_question(
            question, [turn.model_dump() for turn in request.history]
        )
    except Exception as error:
        # Jangan log pertanyaan, kunci, atau isi laporan.
        logger.warning("Chatbot gagal: %s (kode=%s)", type(error).__name__, getattr(error, "code", "-"))
        raise HTTPException(503, "Chatbot sedang tidak tersedia. Coba lagi nanti.") from None
