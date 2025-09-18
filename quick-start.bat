@echo off
echo 🎰 Solana Wheel Game - Quick Start
echo ==================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed

REM Run test setup
echo.
echo 🔧 Running configuration check...
node test-setup.js

REM Check if .env file has been configured
findstr "YOUR_" .env >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo ⚠️  Please configure your .env file before continuing!
    echo 📝 Edit the .env file with your Solana wallet and token details.
    echo.
    echo Required configurations:
    echo - TOKEN_MINT_ADDRESS ^(your Pump.Fun token^)
    echo - HOT_WALLET_PRIVATE_KEY ^(your wallet private key as array^)
    echo - CREATOR_WALLET ^(your creator wallet address^)
    echo - ADMIN_PASSWORD ^(secure password for admin access^)
    echo.
    echo After configuring, run this script again or use: npm run dev
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo.
    echo 📦 Installing dependencies...
    call npm run install:all
)

REM Check if client dependencies are installed
if not exist "client\node_modules" (
    echo.
    echo 📦 Installing client dependencies...
    cd client && npm install && cd ..
)

echo.
echo 🚀 Starting the application...
echo.
echo This will start:
echo - Backend server on http://localhost:5000
echo - Frontend client on http://localhost:3000
echo.
echo Press Ctrl+C to stop the servers
echo.

REM Start the application
npm run dev