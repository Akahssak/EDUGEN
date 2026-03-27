FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies if required (e.g., for FAISS, PyMuPDF)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first to leverage Docker cache
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend application code
COPY backend/ .

# Expose the API port
EXPOSE 8000

# Start the FastAPI server using Uvicorn
# Using sh -c to expand the $PORT environment variable
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
