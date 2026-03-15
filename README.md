# chit-chat

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

- ## TL;DR

"What makes these chatbots tick anyway?"

Guess the next word. We ... just ... do ... this ... over ... and ... over.

But here's the thing. Not every sequence of words means anything--to most people anyway. We would call this stuff gibberish.

So, let's instead look at all the sequences of words we agree have meaning. And there are a lot of them.

Using this "data set", we can now guess what would make sense to come next.

That's it in a nutshell.
