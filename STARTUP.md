# Lazy Blogger Startup Scripts

This repository now includes cross-platform startup scripts to easily run the Realtime STT Web Application.

## Available Scripts

### Linux/macOS: `start_app.sh`

Run the application on Linux or macOS:

```bash
./start_app.sh
```

**Features:**
- Automatically checks and kills existing processes on ports 5000 and 5173
- Starts the Flask API server with auto-reload on port 5000
- Starts the frontend development server on port 5173
- Uses relative paths (works from any directory)
- Provides proper cleanup when stopped with Ctrl+C
- Shows process IDs for manual management if needed

### Windows: `start_app.bat`

Run the application on Windows:

```cmd
start_app.bat
```

**Features:**
- Starts the Flask API server with auto-reload on port 5000
- Starts the frontend development server on port 5173
- Uses relative paths (works from any directory)
- Opens separate command windows for each server

## Prerequisites

Before running either script, make sure you have:

1. **Python 3.12+** installed with required packages:
   ```bash
   pip install -r requirements.txt
   ```

2. **Node.js 20+** and npm installed, with frontend dependencies:
   ```bash
   cd website
   npm install
   ```

3. **Environment variables** configured (if required by the application)

## Usage

1. Navigate to the project directory
2. Run the appropriate startup script for your platform
3. Access the application:
   - API Server: http://localhost:5000
   - Frontend: http://localhost:5173

## Stopping the Application

- **Linux/macOS**: Press `Ctrl+C` in the terminal where you ran `start_app.sh`
- **Windows**: Close the command windows or press any key in the startup script window

## Troubleshooting

- If ports 5000 or 5173 are already in use, the Linux script will automatically kill existing processes
- On Windows, you may need to manually close applications using those ports
- Ensure all dependencies are installed before running the scripts