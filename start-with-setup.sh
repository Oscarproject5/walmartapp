#!/bin/bash

# Change to the directory where this script is located
cd "$(dirname "$0")"

# Display welcome message
echo ""
echo "======================================"
echo "    Walmart App - Setup and Launch"
echo "======================================"
echo ""
echo "This script will:"
echo " 1. Apply the Supabase schema"
echo " 2. Launch the application"
echo ""
echo "Press any key to continue or Ctrl+C to cancel..."
read -n 1 -s

# Run the setup and start script
echo ""
echo "Starting setup process..."
node setup-and-start.js

# If there's an error, pause to show the message
if [ $? -ne 0 ]; then
  echo ""
  echo "Setup encountered an error."
  echo "Press any key to exit..."
  read -n 1 -s
fi 