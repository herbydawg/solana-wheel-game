#!/bin/bash

# Solana Wheel Game - Quick Start Script
echo "🎰 Solana Wheel Game - Quick Start"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Run test setup
echo ""
echo "🔧 Running configuration check..."
node test-setup.js

# Check if .env file has been configured
if grep -q "YOUR_" .env 2>/dev/null; then
    echo ""
    echo "⚠️  Please configure your .env file before continuing!"
    echo "📝 Edit the .env file with your Solana wallet and token details."
    echo ""
    echo "Required configurations:"
    echo "- TOKEN_MINT_ADDRESS (your Pump.Fun token)"
    echo "- HOT_WALLET_PRIVATE_KEY (your wallet private key as array)"
    echo "- CREATOR_WALLET (your creator wallet address)"
    echo "- ADMIN_PASSWORD (secure password for admin access)"
    echo ""
    echo "After configuring, run this script again or use: npm run dev"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm run install:all
fi

# Check if client dependencies are installed
if [ ! -d "client/node_modules" ]; then
    echo ""
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
fi

echo ""
echo "🚀 Starting the application..."
echo ""
echo "This will start:"
echo "- Backend server on http://localhost:5000"
echo "- Frontend client on http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

# Start the application
npm run dev