# Local test script for Google Chat Daily Digest function
# Usage: .\test-gchat.ps1

Write-Host "🧪 Testing Google Chat Daily Digest Function" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if GCHAT_WEBHOOK_URL is set
if ([string]::IsNullOrEmpty($env:GCHAT_WEBHOOK_URL)) {
  Write-Host "❌ Error: GCHAT_WEBHOOK_URL environment variable is not set" -ForegroundColor Red
  Write-Host "Please set it before running this test:" -ForegroundColor Yellow
  Write-Host "  `$env:GCHAT_WEBHOOK_URL = 'https://chat.googleapis.com/v1/spaces/...'" -ForegroundColor Yellow
  exit 1
}

Write-Host "✅ GCHAT_WEBHOOK_URL is configured" -ForegroundColor Green
Write-Host ""

# Start local Supabase edge functions
Write-Host "🚀 Starting Supabase functions server..." -ForegroundColor Cyan
$process = Start-Process -FilePath "supabase" -ArgumentList "functions serve gchat-daily-digest" -PassThru -NoNewWindow

# Wait for server to start
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "📤 Sending test request to local function..." -ForegroundColor Cyan
Write-Host ""

# Prepare test headers
$headers = @{
  "Content-Type" = "application/json"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"
}

# Prepare test body
$body = @{
  time = "manual"
} | ConvertTo-Json

# Send test request
try {
  $response = Invoke-RestMethod -Uri "http://localhost:54321/functions/v1/gchat-daily-digest" `
    -Method POST `
    -Headers $headers `
    -Body $body
  
  Write-Host "✅ Response received:" -ForegroundColor Green
  Write-Host ($response | ConvertTo-Json -Depth 2) -ForegroundColor Green
} catch {
  Write-Host "❌ Error: " -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
  Write-Host ""
  Write-Host "⏹️  Stopping server..." -ForegroundColor Yellow
  Stop-Process -InputObject $process -Force
  Write-Host "✨ Done!" -ForegroundColor Green
}
