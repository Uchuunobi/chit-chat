#!/bin/bash

echo "Starting chit-chat setup..."

# Copy .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please update .env with your credentials before continuing."
    exit 1
fi

# Start containers
echo "Starting containers..."
docker compose up -d

# Wait for ollama to be ready
echo "Waiting for Ollama to start..."
until docker compose exec ollama ollama list > /dev/null 2>&1; do
    sleep 2
done

# Pull models
echo "Pulling llama3:latest..."
docker compose exec ollama ollama pull llama3:latest

echo "Pulling nomic-embed-text..."
docker compose exec ollama ollama pull nomic-embed-text

echo "Setup complete! Visit http://localhost:8080"