@echo off
cd /d "%~dp0ai-server"
echo [AI Server] Starting FastAPI on port 8001...
..\.venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8001 --reload
pause
