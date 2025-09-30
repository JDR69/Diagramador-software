#!/bin/bash
echo "Starting custom startup script..."
cd /home/site/wwwroot
echo "Installing dependencies..."
npm install --omit=dev --no-audit --no-fund
echo "Starting application..."
npm start