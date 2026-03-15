# any-chat

A local AI chat application powered by Ollama, Node.js, PostgreSQL, and nginx.

## Requirements
- Docker Desktop
- NVIDIA GPU (optional, falls back to CPU)

## Setup

### Windows
```
setup.bat
```

### Mac/Linux
```
chmod +x setup.sh
./setup.sh
```

## Usage
Visit http://localhost:8080 after setup completes.

## Stack
- **Frontend** — vanilla HTML/CSS/JS served by nginx
- **Server** — Node.js 22 with Express
- **LLM** — Ollama running llama3:latest
- **Embeddings** — nomic-embed-text
- **Database** — PostgreSQL 16 with pgvector