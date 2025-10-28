#!/bin/bash

# MiniDemand Start All Script
# This script starts all MiniDemand applications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APPS_DIR="$PROJECT_DIR/apps"
LOG_DIR="$PROJECT_DIR/logs"

# Create logs directory
mkdir -p "$LOG_DIR"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start an app
start_app() {
    local app_name=$1
    local app_dir="$APPS_DIR/$app_name"
    local log_file="$LOG_DIR/$app_name.log"
    
    if [ ! -d "$app_dir" ]; then
        print_error "App directory not found: $app_dir"
        return 1
    fi
    
    # Check if app is already running
    local port=$(grep -o 'PORT.*=.*[0-9]*' "$app_dir/server/app.js" | grep -o '[0-9]*' | head -1)
    if [ -z "$port" ]; then
        port=3000
    fi
    
    if check_port $port; then
        print_warning "Port $port is already in use. Skipping $app_name"
        return 0
    fi
    
    print_status "Starting $app_name on port $port..."
    
    # Start the app in background
    cd "$app_dir"
    nohup node server/app.js > "$log_file" 2>&1 &
    local pid=$!
    
    # Save PID for later cleanup
    echo $pid > "$LOG_DIR/$app_name.pid"
    
    # Wait a moment and check if it started successfully
    sleep 2
    if check_port $port; then
        print_success "$app_name started successfully (PID: $pid, Port: $port)"
    else
        print_error "Failed to start $app_name"
        return 1
    fi
}

# Function to stop all apps
stop_all() {
    print_status "Stopping all MiniDemand applications..."
    
    for pid_file in "$LOG_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            local app_name=$(basename "$pid_file" .pid)
            
            if kill -0 $pid 2>/dev/null; then
                print_status "Stopping $app_name (PID: $pid)..."
                kill $pid
                rm "$pid_file"
                print_success "$app_name stopped"
            else
                print_warning "$app_name was not running"
                rm "$pid_file"
            fi
        fi
    done
}

# Function to show status
show_status() {
    print_status "MiniDemand Application Status:"
    echo
    
    for app_dir in "$APPS_DIR"/*; do
        if [ -d "$app_dir" ]; then
            local app_name=$(basename "$app_dir")
            local pid_file="$LOG_DIR/$app_name.pid"
            
            if [ -f "$pid_file" ]; then
                local pid=$(cat "$pid_file")
                if kill -0 $pid 2>/dev/null; then
                    print_success "$app_name: Running (PID: $pid)"
                else
                    print_warning "$app_name: Stopped (stale PID file)"
                    rm "$pid_file"
                fi
            else
                print_warning "$app_name: Not running"
            fi
        fi
    done
}

# Main script logic
main() {
    case "${1:-start}" in
        "start")
            print_status "🚀 Starting MiniDemand Applications..."
            echo
            
            # Start each app
            for app_dir in "$APPS_DIR"/*; do
                if [ -d "$app_dir" ]; then
                    local app_name=$(basename "$app_dir")
                    start_app "$app_name"
                fi
            done
            
            echo
            print_success "All applications started!"
            print_status "Check logs in: $LOG_DIR"
            echo
            show_status
            ;;
            
        "stop")
            stop_all
            ;;
            
        "restart")
            stop_all
            sleep 2
            main start
            ;;
            
        "status")
            show_status
            ;;
            
        "logs")
            local app_name=${2:-"all"}
            if [ "$app_name" = "all" ]; then
                for log_file in "$LOG_DIR"/*.log; do
                    if [ -f "$log_file" ]; then
                        echo "=== $(basename "$log_file") ==="
                        tail -20 "$log_file"
                        echo
                    fi
                done
            else
                local log_file="$LOG_DIR/$app_name.log"
                if [ -f "$log_file" ]; then
                    tail -f "$log_file"
                else
                    print_error "No log file found for $app_name"
                fi
            fi
            ;;
            
        *)
            echo "Usage: $0 {start|stop|restart|status|logs [app_name]}"
            echo
            echo "Commands:"
            echo "  start   - Start all applications"
            echo "  stop    - Stop all applications"
            echo "  restart - Restart all applications"
            echo "  status  - Show application status"
            echo "  logs    - Show logs (optionally for specific app)"
            exit 1
            ;;
    esac
}

# Handle Ctrl+C
trap 'echo; print_warning "Received interrupt signal. Use \`$0 stop\` to stop all applications."; exit 0' INT

# Run main function
main "$@"
