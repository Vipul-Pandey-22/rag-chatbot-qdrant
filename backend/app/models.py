from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class IngestRequest(BaseModel):
    text: str
    metadata: Dict[str, Any] = {}
    namespace: str = "default"

class ChatRequest(BaseModel):
    query: str
    session_id: str
    namespace: str = "default"

class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
