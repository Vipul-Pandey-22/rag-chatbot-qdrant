import uuid
import time
import logging
from typing import List, Dict, Any
from qdrant_client import QdrantClient, models
from langchain_groq import ChatGroq
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.settings import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
# Initialise components (Qdrant client, embeddings, LLM)
# ----------------------------------------------------------------------
qdrant = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
embeddings = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)
llm = ChatGroq(api_key=settings.GROQ_API_KEY, model_name="llama-3.3-70b-versatile")

DOCS_COLLECTION = "documents"
CONVO_COLLECTION = "conversations"


def init_db() -> None:
    """Create the two collections if they do not exist."""
    max_retries = 5
    for i in range(max_retries):
        try:
            if not qdrant.collection_exists(DOCS_COLLECTION):
                qdrant.create_collection(
                    collection_name=DOCS_COLLECTION,
                    vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
                )
                logger.info(f"Created collection {DOCS_COLLECTION}")
            if not qdrant.collection_exists(CONVO_COLLECTION):
                qdrant.create_collection(
                    collection_name=CONVO_COLLECTION,
                    vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
                )
                logger.info(f"Created collection {CONVO_COLLECTION}")
            logger.info("Qdrant initialized successfully")
            return
        except Exception as e:
            logger.warning(f"Attempt {i+1}/{max_retries} to connect to Qdrant failed: {e}")
            time.sleep(2)
    logger.error("Could not connect to Qdrant after multiple retries")


def ingest_doc(text: str, metadata: Dict[str, Any], namespace: str) -> None:
    """Embed a document and store it in the `documents` collection."""
    logger.info(f"Ingesting document into namespace {namespace}")
    vector = embeddings.embed_query(text)
    payload = metadata.copy()
    payload["text"] = text
    payload["namespace"] = namespace
    qdrant.upsert(
        collection_name=DOCS_COLLECTION,
        points=[
            models.PointStruct(id=str(uuid.uuid4()), vector=vector, payload=payload)
        ],
    )
    logger.info("Document ingested successfully")


def get_hyde_embedding(query: str) -> List[float]:
    """Generate a hypothetical answer (HyDE) and embed it."""
    prompt = ChatPromptTemplate.from_template(
        "Write a short passage to answer this question: {question}"
    )
    chain = prompt | llm | StrOutputParser()
    hypothetical_answer = chain.invoke({"question": query})
    return embeddings.embed_query(hypothetical_answer)


def _retrieve_history(session_id: str) -> List[models.PointStruct]:
    """Fetch conversation history for a session."""
    points, _ = qdrant.scroll(
        collection_name=CONVO_COLLECTION,
        scroll_filter=models.Filter(
            must=[models.FieldCondition(key="session_id", match=models.MatchValue(value=session_id))]
        ),
        limit=100,
        with_payload=True,
    )
    points.sort(key=lambda p: p.payload.get("timestamp", 0))
    return points[-settings.MEMORY_WINDOW * 2 :] if points else []


def get_chat_response(query: str, session_id: str, namespace: str) -> Dict[str, Any]:
    """Main RAG pipeline: retrieve docs, build prompt, call LLM, store turn."""
    logger.info(
        f"Processing chat query: {query} (session: {session_id}, namespace: {namespace})"
    )
    
    # 1️ Retrieve relevant documents (HyDE)
    query_vector = get_hyde_embedding(query)
    search_result = qdrant.query_points(
        collection_name=DOCS_COLLECTION,
        query=query_vector,
        query_filter=models.Filter(
            must=[models.FieldCondition(key="namespace", match=models.MatchValue(value=namespace))]
        ),
        limit=3,  # Reduced from 5 to avoid Groq token limit
    ).points
    
    # Truncate each document to 500 chars and escape curly braces for template compatibility
    context_chunks = [hit.payload.get("text", "")[:500].replace("{", "{{").replace("}", "}}") for hit in search_result]
    context_text = "\n\n".join(context_chunks)
    
    # 2️ Retrieve recent conversation history (limit to last 4 messages)
    recent_history = _retrieve_history(session_id)
    history_chunks = [f"{p.payload['role']}: {p.payload['text'][:200].replace('{', '{{').replace('}', '}}')}" for p in recent_history[-4:]]
    history_text = "\n".join(history_chunks)
    
    # 3️ Build final prompt and get answer from LLM
    system_prompt = f"""You are a helpful assistant. Use the following context and conversation history to answer the user's question.

Context:
{context_text}

History:
{history_text}
"""
    final_prompt = ChatPromptTemplate.from_messages(
        [("system", system_prompt), ("user", "{question}")]
    )
    chain = final_prompt | llm | StrOutputParser()
    answer = chain.invoke({"question": query})
    
    # 4️⃣ Store user turn
    qdrant.upsert(
        collection_name=CONVO_COLLECTION,
        points=[
            models.PointStruct(
                id=str(uuid.uuid4()),
                vector=embeddings.embed_query(query),
                payload={
                    "session_id": session_id,
                    "role": "User",
                    "text": query,
                    "timestamp": time.time(),
                },
            )
        ],
    )
    
    # 5️⃣ Store assistant turn
    qdrant.upsert(
        collection_name=CONVO_COLLECTION,
        points=[
            models.PointStruct(
                id=str(uuid.uuid4()),
                vector=embeddings.embed_query(answer),
                payload={
                    "session_id": session_id,
                    "role": "Assistant",
                    "text": answer,
                    "timestamp": time.time(),
                },
            )
        ],
    )
    
    return {"answer": answer, "sources": [hit.payload for hit in search_result]}