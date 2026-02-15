
# Deploy NeuroLearn Backend to Google Cloud Run

$projectParams = @(
    "--source .",
    "--region us-central1",
    "--allow-unauthenticated",
    "--set-env-vars", "GROQ_API_KEY=YOUR_GROQ_KEY,DATABASE_URL=YOUR_DB_URL,TUTOR_SERVICE_URL=http://localhost:5001"
)

Write-Host "🚀 Deploying NeuroLearn Backend to Google Cloud Run..." -ForegroundColor Cyan

# Check if gcloud is installed
if (-not (Get-Command "gcloud" -ErrorAction SilentlyContinue)) {
    Write-Error "❌ Google Cloud SDK is not installed. Please install it first: https://cloud.google.com/sdk/docs/install"
    exit 1
}

# Run deployment
gcloud run deploy neuro-backend @projectParams

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "👉 Update your VITE_API_URL in Cloudflare Pages to the URL provided above." -ForegroundColor Yellow
}
else {
    Write-Error "❌ Deployment failed. Please check the logs above."
}
