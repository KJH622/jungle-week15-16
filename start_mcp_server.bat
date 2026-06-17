@echo off
cd /d "%~dp0ai-server"
echo [MCP Server] Starting on port 8002...
..\.venv\Scripts\python.exe mcp_server.py
pause
