# -------------------------
# Stage 1: Build the Vite frontend
# -------------------------
    FROM node:18-alpine AS build-frontend

    # Set the working directory for the frontend
    WORKDIR /app/frontend
    
    # Copy only package files first for better caching
    COPY frontend/package*.json ./
    
    # Install Node.js dependencies
    RUN npm install
    
    # Copy the rest of the frontend source
    COPY frontend/ ./
    
    # Build the frontend (Vite will create /app/frontend/dist)
    RUN npm run build
    
    
    # -------------------------
    # Stage 2: Build & run the Python/FastAPI backend
    # -------------------------
    FROM python:3.11-slim AS final
    
    # Set the working directory for the backend
    WORKDIR /app
    
    # Copy and install Python dependencies
    COPY backend/requirements.txt ./backend/
    RUN pip install --no-cache-dir -r backend/requirements.txt
    
    # Copy backend code
    COPY backend/ ./backend/
    
    # Copy the built frontend from the first stage
    # This ensures your final image has the compiled JS/CSS in /app/frontend/dist
    COPY --from=build-frontend /app/frontend/dist ./frontend/dist
    
    # Expose your application port (80 by default)
    EXPOSE 80
    
    # Run FastAPI via Uvicorn
    CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "80"]
    