FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Create directory for model cache with proper permissions
RUN mkdir -p /app/models && chmod 777 /app/models

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV MODEL_CACHE_DIR=/app/models
ENV HF_HOME=/app/models
ENV TRANSFORMERS_CACHE=/app/models
ENV HUGGINGFACE_HUB_CACHE=/app/models
ENV PYTHONPATH=/app

# Pre-download both primary and fallback models during build for faster startup
RUN python -c "import huggingface_hub; huggingface_hub.snapshot_download('openai/whisper-small', cache_dir='/app/models')" || echo "Primary model download failed, will retry at runtime"
RUN python -c "import huggingface_hub; huggingface_hub.snapshot_download('openai/whisper-tiny', cache_dir='/app/models')" || echo "Fallback model download failed, will retry at runtime"

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "app.py"]
