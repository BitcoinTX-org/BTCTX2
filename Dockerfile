# syntax=docker/dockerfile:1

################################################################################
# Stage 1: Build the Vite frontend
################################################################################
FROM node:18-alpine AS build-frontend

# Set the working directory for the frontend build
WORKDIR /app/frontend

# Copy only package files first (for better caching of npm install)
COPY frontend/package*.json ./
RUN npm install

# Copy the rest of the frontend source
COPY frontend/ ./

# Build the frontend (Vite will create /app/frontend/dist)
RUN npm run build


################################################################################
# Stage 2: Final image with Python + FastAPI + DB creation
################################################################################
FROM python:3.11-slim AS final

# Create an /app directory inside the container
WORKDIR /app

# Copy and install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy your backend code (including create_db.py, database.py, etc.)
COPY backend/ ./backend/

# Copy the compiled frontend from Stage 1 into /app/frontend/dist
COPY --from=build-frontend /app/frontend/dist ./frontend/dist

# Run the DB creation script to initialize a fresh database inside the container
RUN python ./backend/create_db.py

# Expose port 80 inside the container
EXPOSE 80

# Run FastAPI via Uvicorn on port 80
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "80"]
