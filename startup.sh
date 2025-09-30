#!/bin/bash
echo "Starting custom startup script..."
cd /home/site/wwwroot
echo "Checking dependencies..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "Installing dependencies..."
    npm install --omit=dev --no-audit --no-fund
else
    echo "Dependencies already installed, skipping npm install"
fi
echo "Starting application..."
npm start