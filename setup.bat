@echo off
echo Starting any-chat setup...

:: Copy .env if it doesn't exist
if not exist .env (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo Please update .env with your credentials before continuing.
    exit /b 1
)

:: Start containers
echo Starting containers...
docker compose up -d

:: Wait for ollama to be ready
echo Waiting for Ollama to start...
:wait
docker compose exec ollama ollama list >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait
)

:: Pull models
echo Pulling llama3:latest...
docker compose exec ollama ollama pull llama3:latest

echo Pulling nomic-embed-text...
docker compose exec ollama ollama pull nomic-embed-text

echo Setup complete! Visit http://localhost:8080
pause