#!/bin/bash
export TUTOR_PORT=5001
export TUTOR_SERVICE_URL="http://localhost:$TUTOR_PORT"

echo "Starting Tutor Service on port $TUTOR_PORT..."
# Start tutor service in background
# We pass PORT explicitly as 5001 to override any environment PORT
PORT=$TUTOR_PORT python3 tutor_service/app.py &

echo "Starting Node.js Backend..."
# The main PORT (e.g. 5000/10000) will be picked up by server.js
npm start
