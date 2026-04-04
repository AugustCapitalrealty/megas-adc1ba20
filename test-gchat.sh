#!/bin/bash

# Local test script for Google Chat Daily Digest function
# Usage: ./test-gchat.sh

echo "🧪 Testing Google Chat Daily Digest Function"
echo "=============================================="
echo ""

# Check if GCHAT_WEBHOOK_URL is set
if [ -z "$GCHAT_WEBHOOK_URL" ]; then
  echo "❌ Error: GCHAT_WEBHOOK_URL environment variable is not set"
  echo "Please set it before running this test:"
  echo "  export GCHAT_WEBHOOK_URL='https://chat.googleapis.com/v1/spaces/...'"
  exit 1
fi

echo "✅ GCHAT_WEBHOOK_URL is configured"
echo ""

# Start local Supabase edge functions
echo "🚀 Starting Supabase functions server..."
supabase functions serve gchat-daily-digest &
SERVER_PID=$!

# Wait for server to start
sleep 2

echo ""
echo "📤 Sending test request to local function..."
echo ""

# Send test request
curl -X POST http://localhost:54321/functions/v1/gchat-daily-digest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eHl6IiwiZmlkIjoiMDAwMDAwMDAwMDAwMDAwIiwiYXV0aF90aW1lIjowLCJ1c2VyX2lkIjoiMDAwMDAwMDAwMDAwMDAwMCIsInN1cCI6ZmFsc2UsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwibWVhIjoxLCJlbWFpbCI6IiIsImVtYWlsX2NvbmZpcm1lZCI6ZmFsc2UsInBob25lX2NvbmZpcm1lZCI6ZmFsc2UsImFwcF9tZXRhZGF0YSI6e30sInVzZXJfbWV0YWRhdGEiOnt9LCJpZGVudGl0aWVzIjpbXSwia3RfZiI6ImU2LWRjNzBkLTI1LTFkOS00MzJjLWJiZTAxZjIyNDY0ZiIsImF0X2hhc2giOiIiLCJjX3ZlciI6IiIsInNlc3Npb25faWQiOiIifQ.test" \
  -d '{"time": "manual"}' \
  -i

echo ""
echo ""
echo "✅ Test complete!"
echo "Check the Google Chat Space for the incoming message."
echo ""
echo "⏹️  Stopping server..."
kill $SERVER_PID

echo "✨ Done!"
