@echo off
setlocal
cd /d "%~dp0"

echo Checking Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
  echo Node.js is not installed. Please install Node.js v20+.
  pause
  exit /b 1
)

echo Checking pnpm...
call pnpm -v >nul 2>&1
if %errorlevel% neq 0 (
  echo pnpm not found. Activating via corepack...
  corepack enable pnpm
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call pnpm install
)

echo Starting StreamerHub Desktop...
call pnpm dev:desktop
pause
