# RAG Chatbot with Qdrant

A production-ready Retrieval-Augmented Generation (RAG) chatbot built with FastAPI, React, and Qdrant vector database. Features conversational memory, namespace-based document organization, and HyDE (Hypothetical Document Embeddings) retrieval.

## 🚀 Features

- **RAG Pipeline**: Semantic search over your documents using vector embeddings
- **HyDE Retrieval**: Enhanced retrieval using hypothetical document embeddings
- **Conversational Memory**: Maintains context across chat turns using Qdrant
- **Namespace Support**: Organize documents by namespace/project
- **Metadata Search**: Filter documents using custom metadata
- **Modern UI**: React-based chat interface with glassmorphism design
- **Dockerized**: Complete containerization for easy deployment

## 🛠️ Tech Stack

### Backend

- **FastAPI**: Modern Python web framework for the API
- **Qdrant**: Vector database for embeddings and conversation history
- **LangChain**: RAG orchestration and prompt management
- **Groq**: LLM provider (llama-3.3-70b-versatile model)
- **Sentence Transformers**: Text embedding model (all-MiniLM-L6-v2)
- **UV**: Python dependency management

### Frontend

- **React**: UI framework
- **Vite**: Build tool
- **Framer Motion**: Animations
- **React Dropzone**: File upload handling

### Infrastructure

- **Docker & Docker Compose**: Containerization
- **Nginx**: Frontend web server

## 📋 Prerequisites

- **Docker** and **Docker Compose** installed
- **Groq API Key** (get yours at https://console.groq.com/)
- At least **8GB RAM** (for embedding models)
- **Windows/Linux/macOS** with Docker support

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
cd "c:\Users\vip\Desktop\Personal Repo\Hackthon"
```

### 2. Configure Environment Variables

Create/edit the `.env` file in the project root:

```bash
GROQ_API_KEY=your_groq_api_key_here
QDRANT_URL=http://qdrant:6333
```

**Important**: Replace `your_groq_api_key_here` with your actual Groq API key.

### 3. Build and Start Services

```bash
docker-compose up -d --build
```

This will start three services:

- **Qdrant** (port 6333): Vector database
- **Backend** (port 8000): FastAPI server
- **Frontend** (port 5173): React UI

### 4. Verify Services

Check all containers are running:

```bash
docker ps
```

You should see:

- `hackthon-qdrant-1`
- `hackthon-backend-1`
- `hackthon-frontend-1`

Test the backend health:

```bash
curl http://localhost:8000/health
```

Expected response: `{"status":"ok"}`

## 🎯 Usage

### Access the Chat UI

Open your browser and navigate to:

```
http://localhost:5173
```

### Upload Documents

1. Click the **"Upload Docs"** tab
2. Either:
   - **Paste text** directly into the text area
   - **Drag and drop** files (`.txt`, `.md`, `.json`, `.csv`)
3. (Optional) Add metadata as JSON
4. (Optional) Set a custom namespace
5. Click **"Upload Document"**

### Chat with Your Documents

1. Switch to the **"Chat"** tab
2. Type your question in the input field
3. Press **Send** or hit **Enter**
4. The bot will:
   - Search your uploaded documents using HyDE
   - Retrieve conversation history
   - Generate a contextual answer
   - Show source documents used

### Namespace Management

- Click the **settings icon (⚙️)** in the top-right
- Change the namespace to organize/isolate document sets
- Default namespace is `"default"`

## 🔍 How It Works

### Document Ingestion Flow

```
Text Input → Embedding Model → Vector Storage (Qdrant)
                ↓
         [metadata + namespace]
```

### Chat/Query Flow

```
1. User Query
   ↓
2. HyDE: Generate hypothetical answer → Embed
   ↓
3. Search Qdrant (filter by namespace)
   ↓
4. Retrieve conversation history
   ↓
5. Build prompt (context + history)
   ↓
6. Call Groq LLM
   ↓
7. Store turn in conversation history
   ↓
8. Return answer + sources
```

## 📁 Project Structure

```
Hackthon/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── rag.py           # RAG pipeline logic
│   │   ├── models.py        # Pydantic models
│   │   └── settings.py      # Configuration
│   ├── Dockerfile           # Backend container
│   ├── pyproject.toml       # Python dependencies
│   └── uv.lock             # Locked dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx
│   │   │   └── UploadDocs.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   ├── Dockerfile          # Frontend container
│   └── package.json
├── docker-compose.yml      # Service orchestration
├── .env                    # Environment variables
└── README.md              # This file
```

## 🐛 Troubleshooting

### Backend not starting

**Check logs:**

```bash
docker logs hackthon-backend-1
```

**Common issues:**

- Missing `GROQ_API_KEY` in `.env`
- Qdrant not ready (wait 10s and restart)
- Port 8000 already in use

### HTTP 413 "Request Too Large"

This is fixed in the current version by:

- Limiting retrieved documents to 3
- Truncating each document to 500 chars
- Limiting conversation history to 4 messages

If you still see this, your documents are extremely large. Consider chunking them before upload.

### "unexpected '{' in field name"

This is fixed by escaping curly braces in document text. If you see this:

1. Rebuild the backend: `docker-compose up -d --build backend`
2. Restart: `docker-compose restart backend`

### Frontend not accessible

```bash
# Check if container is running
docker ps | grep frontend

# If not running, start it
docker-compose up -d frontend
```

### Qdrant data not persisting

Data is stored in a Docker volume `qdrant_data`. To check:

```bash
docker volume ls
docker exec hackthon-backend-1 python -c "from qdrant_client import QdrantClient; client = QdrantClient(url='http://qdrant:6333'); print('Documents:', client.get_collection('documents').points_count)"
```

## 🔄 Updating the Application

After making code changes:

```bash
# Rebuild and restart
docker-compose up -d --build

# Or rebuild specific service
docker-compose up -d --build backend
```

## 🛑 Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## 📊 Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker logs -f hackthon-backend-1
docker logs -f hackthon-frontend-1
docker logs -f hackthon-qdrant-1
```

### Check Qdrant Collections

```bash
docker exec hackthon-backend-1 python -c "
from qdrant_client import QdrantClient
client = QdrantClient(url='http://qdrant:6333')
print('Documents:', client.get_collection('documents').points_count if client.collection_exists('documents') else 0)
print('Conversations:', client.get_collection('conversations').points_count if client.collection_exists('conversations') else 0)
"
```

## 🚀 Production Deployment

For production use:

1. **Set secure environment variables** (don't commit `.env`)
2. **Use HTTPS** with proper SSL certificates
3. **Add authentication** to the FastAPI endpoints
4. **Configure CORS** properly in `backend/app/main.py`
5. **Use managed Qdrant** (Qdrant Cloud) instead of local Docker
6. **Set up monitoring** (e.g., Prometheus + Grafana)
7. **Implement rate limiting** on the API

## 📝 API Documentation

Once running, visit:

```
http://localhost:8000/docs
```

For interactive Swagger API documentation.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Qdrant** for the excellent vector database
- **Groq** for fast LLM inference
- **LangChain** for RAG orchestration
- **Sentence Transformers** for embeddings
