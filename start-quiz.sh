#!/usr/bin/env bash

cd "$(dirname "$0")/server" || { echo "Server directory not found"; exit 1; }

if [ ! -d "node_modules" ]; then
    echo "[Setup] Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "[ERROR] npm install failed."
        echo "Make sure Node.js is installed and you have an internet connection."
        echo ""
        read -rp "Press Enter to close..."
        exit 1
    fi
fi

clear
echo ""
echo "============================================================"
echo "              QUIZ SERVER — THE HOT SEAT"
echo "============================================================"
echo ""
echo " After the server starts, look for this line:"
echo ""
echo "     Server listening on http://192.168.x.x:4000"
echo ""
echo " That IP (the 192.168.x.x part) is the address every"
echo " other device uses to connect to this laptop."
echo ""
echo " ---"
echo " On THIS laptop you can also use:"
echo "     http://localhost:4000"
echo " ---"
echo ""
echo " PRESS Ctrl+C TO STOP THE SERVER"
echo "============================================================"
echo ""

npm run dev

echo ""
echo "============================================================"
echo "  Server stopped."
echo "  You may close this window."
echo "============================================================"
echo ""
read -rp "Press Enter to close..."
