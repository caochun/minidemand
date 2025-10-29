#!/bin/bash
# Start script for Desktop App

echo "Starting MiniDemand Interactive Desktop Application..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Dependencies not found. Installing..."
  npm install
fi

# Start the server
echo "Starting server on port 3004..."
node server/app.js

