#!/bin/bash

echo "Starting Realtime STT Web Application..."
echo

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "Killing existing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Check and kill existing processes on our ports
if check_port 5000; then
    echo "Port 5000 is already in use. Stopping existing process..."
    kill_port 5000
fi

if check_port 5173; then
    echo "Port 5173 is already in use. Stopping existing process..."
    kill_port 5173
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting API server with auto-reload..."
cd "$SCRIPT_DIR"
python -m flask --app api_server run --debug --port 5000 &
API_PID=$!

echo "Waiting for API server to start..."
sleep 3

echo "Starting frontend development server..."
cd "$SCRIPT_DIR/website"
npm run dev &
FRONTEND_PID=$!

echo
echo "Both servers are starting..."
echo "API Server: http://localhost:5000 (with auto-reload)"
echo "Frontend: http://localhost:5173"
echo
echo "Process IDs:"
echo "API Server PID: $API_PID"
echo "Frontend PID: $FRONTEND_PID"
echo
echo "Press Ctrl+C to stop both servers"

# Function to handle cleanup on script exit
cleanup() {
    echo
    echo "Stopping servers..."
    if kill -0 $API_PID 2>/dev/null; then
        kill $API_PID
        echo "Stopped API server (PID: $API_PID)"
    fi
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "Stopped frontend server (PID: $FRONTEND_PID)"
    fi
    echo "All servers stopped."
    exit 0
}

# Set up trap to catch Ctrl+C and call cleanup
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait