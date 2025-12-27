# YCW Email Relay Service Setup Script (PowerShell)

Write-Host "🚀 Setting up YCW Email Relay Service..." -ForegroundColor Cyan

# Check Node.js version
$nodeVersion = node -v
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js version check passed: $nodeVersion" -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
pnpm install

# Create .env file if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file from .env.example..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit .env file with your configuration before running the application" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Create database directory
Write-Host "🗄️  Creating database directory..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path database | Out-Null

# Initialize database
Write-Host "🗄️  Initializing database..." -ForegroundColor Cyan
pnpm migrate

# Build project
Write-Host "🔨 Building project..." -ForegroundColor Cyan
pnpm build

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env file with your configuration"
Write-Host "2. Run 'pnpm dev' for development or 'pnpm start' for production"
Write-Host "3. Generate an API key: POST /api/v1/api-keys/generate"
Write-Host ""

