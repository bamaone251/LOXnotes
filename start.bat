@echo off
title Load Desk Daily Notes
if not exist node_modules call npm install
if errorlevel 1 pause & exit /b 1
start "" http://localhost:8082
npm start
pause
