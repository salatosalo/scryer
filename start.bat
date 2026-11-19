@echo off
title SCRYER - LoL Minute-by-Minute Timeline Coach
cd /d "%~dp0"

if not exist ".env.local" (
  copy ".env.local.example" ".env.local" >nul
  echo Created .env.local from .env.local.example.
  echo Paste your RIOT_API_KEY and GEMINI_API_KEY into .env.local for live matches!
  echo.
)

echo Starting SCRYER on http://localhost:3000 ...
start "" http://localhost:3000
npm.cmd run dev
