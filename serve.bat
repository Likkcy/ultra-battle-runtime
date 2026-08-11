@echo off
cd /d "%~dp0"
echo Ultra Battle Runtime Showcase
echo http://127.0.0.1:8080
echo Press Ctrl+C to stop.
py -m http.server 8080
pause
