@echo off
echo Starting Piazza Artificiale...

REM Check if Python is available
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using Python to start local server
    start http://localhost:8000
    python -m http.server
) else (
    echo Python not found, trying Python3
    python3 --version >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo Using Python3 to start local server
        start http://localhost:8000
        python3 -m http.server
    ) else (
        echo Python not found. Please install Python or use another web server.
        echo See README.md for alternative options.
        pause
    )
)