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
    metadata_filters: Optional[Dict[str, Any]] = None  # Optional metadata filters for search

class ChatResponse(BaseModel):
    answer: str
    reasoning: Optional[str] = None
    sources: List[Dict[str, Any]]

class MetadataStatsResponse(BaseModel):
    namespaces: List[str]
    metadata_keys: Dict[str, List[Any]]  # key -> list of unique values
