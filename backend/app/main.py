from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.models import IngestRequest, ChatRequest, ChatResponse, MetadataStatsResponse
from app.rag import ingest_doc, get_chat_response, init_db, get_metadata_stats, extract_text_from_pdf
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RAG Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up application...")
    init_db()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )

@app.post("/ingest")
async def ingest(request: IngestRequest):
    try:
        logger.info(f"Received ingest request for namespace: {request.namespace}")
        ingest_doc(request.text, request.metadata, request.namespace)
        return {"status": "success", "message": "Document ingested"}
    except Exception as e:
        logger.error(f"Ingest failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ingest/file")
async def ingest_file(
    file: UploadFile = File(...),
    namespace: str = Form(...),
    metadata: str = Form("{}")
):
    """Ingest a file (PDF or TXT) with metadata."""
    try:
        logger.info(f"Received file upload: {file.filename} for namespace: {namespace}")
        
        # Read file content
        file_content = await file.read()
        
        # Extract text based on file type
        if file.filename.endswith('.pdf'):
            text = extract_text_from_pdf(file_content)
        elif file.filename.endswith('.txt'):
            text = file_content.decode('utf-8')
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Only PDF and TXT are supported.")
        
        # Parse metadata JSON
        metadata_dict = json.loads(metadata)
        metadata_dict['filename'] = file.filename
        
        # Ingest the document
        ingest_doc(text, metadata_dict, namespace)
        
        return {"status": "success", "message": f"File {file.filename} ingested successfully"}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid metadata JSON")
    except Exception as e:
        logger.error(f"File ingest failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        logger.info(f"Received chat request: {request.query}")
        response = get_chat_response(
            request.query, 
            request.session_id, 
            request.namespace,
            request.metadata_filters  # Pass metadata filters
        )
        return response
    except Exception as e:
        logger.error(f"Chat failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metadata/stats", response_model=MetadataStatsResponse)
async def metadata_stats(namespace: str = None):
    """Get available namespaces and metadata fields."""
    try:
        logger.info(f"Fetching metadata stats for namespace: {namespace}")
        stats = get_metadata_stats(namespace)
        return stats
    except Exception as e:
        logger.error(f"Metadata stats failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}
