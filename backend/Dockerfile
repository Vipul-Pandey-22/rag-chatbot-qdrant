FROM python:3.11-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
# Install PyTorch CPU-only first to avoid CUDA conflicts
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu
RUN uv sync --frozen
RUN pip install "qdrant-client>=1.5.0"

# Copy app code
COPY app ./app

# Expose port
EXPOSE 8000

# Run app
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
