@echo off
setlocal EnableDelayedExpansion
title StreamerHub Dev Launcher

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║        StreamerHub Dev Launcher          ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── 1. Check Node.js ────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found.
    echo         Download from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%

:: ── 2. Enable Corepack / ensure pnpm ────────────────────────────────
where pnpm >nul 2>&1
if errorlevel 1 (
    echo  [INFO] pnpm not found. Enabling via Corepack...
    corepack enable 2>nul
    corepack prepare pnpm@9 --activate 2>nul
    where pnpm >nul 2>&1
    if errorlevel 1 (
        echo  [ERROR] Could not activate pnpm. Run: npm install -g pnpm
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%v in ('pnpm --version') do set PNPM_VER=%%v
echo  [OK] pnpm %PNPM_VER%

:: ── 3. Install dependencies if node_modules is missing ───────────────
if not exist "node_modules\" (
    echo  [INFO] Installing dependencies (first run)...
    pnpm install --frozen-lockfile
    if errorlevel 1 (
        echo  [ERROR] pnpm install failed. Check your internet connection.
        pause
        exit /b 1
    )
    echo  [OK] Dependencies installed.
) else (
    echo  [OK] node_modules present — skipping install.
)

:: ── 4. Launch Infrastructure ──────────────────────────────────────────
echo.
echo  Starting Infrastructure (Redis, DB) using Docker Compose...
pnpm infra:up
if errorlevel 1 (
    echo  [WARNING] Failed to start Docker Compose infrastructure.
    echo  If you don't have Docker, make sure you are running Postgres and Redis manually.
)

:: ── 5. Launch dev stack (Desktop + Backend) ─────────────────────────
echo.
echo  Starting StreamerHub Desktop and Backend in development mode...
echo  Press Ctrl+C to stop.
echo.

pnpm dev:stack
if errorlevel 1 (
    echo.
    echo  [ERROR] StreamerHub exited with an error.
    echo         Check the output above for details.
    pause
    exit /b 1
)
