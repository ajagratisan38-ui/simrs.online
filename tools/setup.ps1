# ============================================
# SIMRS SaaS — Setup Script (Windows PowerShell)
# Jalankan: .\tools\setup.ps1
# ============================================

$ErrorActionPreference = "Stop"

function Write-Step($step, $msg) {
  Write-Host "`n[$step] $msg" -ForegroundColor Cyan
}

function Write-Ok($msg) {
  Write-Host "  OK: $msg" -ForegroundColor Green
}

function Write-Fail($msg) {
  Write-Host "  GAGAL: $msg" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  SIMRS SaaS - Setup Development Environment" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow

# ------------------------------------------
# 1. Cek Prerequisites
# ------------------------------------------
Write-Step "1/7" "Mengecek prerequisites..."

# Node.js
try {
  $nodeVersion = node --version 2>&1
  if ($nodeVersion -match "v(\d+)") {
    $major = [int]$Matches[1]
    if ($major -ge 20) {
      Write-Ok "Node.js $nodeVersion"
    } else {
      Write-Fail "Node.js versi $nodeVersion terlalu lama. Butuh >= 20."
      exit 1
    }
  }
} catch {
  Write-Fail "Node.js belum terinstall. Download di https://nodejs.org"
  exit 1
}

# pnpm
try {
  $pnpmVersion = pnpm --version 2>&1
  Write-Ok "pnpm v$pnpmVersion"
} catch {
  Write-Fail "pnpm belum terinstall. Jalankan: npm install -g pnpm"
  exit 1
}

# Docker
try {
  $dockerVersion = docker --version 2>&1
  Write-Ok "$dockerVersion"
} catch {
  Write-Fail "Docker belum terinstall. Download di https://docker.com/products/docker-desktop"
  exit 1
}

# Docker running?
try {
  docker info 2>&1 | Out-Null
  Write-Ok "Docker Desktop sedang berjalan"
} catch {
  Write-Fail "Docker Desktop belum berjalan. Buka Docker Desktop terlebih dahulu."
  exit 1
}

# Git
try {
  $gitVersion = git --version 2>&1
  Write-Ok "$gitVersion"
} catch {
  Write-Fail "Git belum terinstall. Download di https://git-scm.com"
  exit 1
}

# ------------------------------------------
# 2. Copy .env
# ------------------------------------------
Write-Step "2/7" "Menyiapkan file .env..."

if (-Not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Ok "File .env dibuat dari .env.example"
} else {
  Write-Ok "File .env sudah ada, skip"
}

# ------------------------------------------
# 3. Install dependencies
# ------------------------------------------
Write-Step "3/7" "Menginstall dependencies (pnpm install)..."
pnpm install
if ($LASTEXITCODE -ne 0) {
  Write-Fail "pnpm install gagal"
  exit 1
}
Write-Ok "Dependencies terinstall"

# ------------------------------------------
# 4. Start Docker containers
# ------------------------------------------
Write-Step "4/7" "Menjalankan Docker containers (PostgreSQL + Redis)..."
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
  Write-Fail "docker-compose up gagal"
  exit 1
}
Write-Ok "Containers berjalan"

# ------------------------------------------
# 5. Tunggu PostgreSQL ready
# ------------------------------------------
Write-Step "5/7" "Menunggu PostgreSQL siap..."
$maxRetries = 30
$retry = 0
while ($retry -lt $maxRetries) {
  try {
    $result = docker exec simrs-postgres pg_isready -U simrs -d simrs_db 2>&1
    if ($result -match "accepting connections") {
      Write-Ok "PostgreSQL siap menerima koneksi"
      break
    }
  } catch {}
  $retry++
  Write-Host "  Menunggu... ($retry/$maxRetries)" -ForegroundColor Gray
  Start-Sleep -Seconds 2
}

if ($retry -ge $maxRetries) {
  Write-Fail "PostgreSQL tidak siap setelah $maxRetries percobaan"
  exit 1
}

# ------------------------------------------
# 6. Run migrations
# ------------------------------------------
Write-Step "6/7" "Menjalankan database migrations..."
pnpm db:migrate
if ($LASTEXITCODE -ne 0) {
  Write-Fail "Migration gagal"
  exit 1
}
Write-Ok "Migrations berhasil"

# ------------------------------------------
# 7. Run seeds
# ------------------------------------------
Write-Step "7/7" "Mengisi data demo (seeds)..."
pnpm db:seed
if ($LASTEXITCODE -ne 0) {
  Write-Fail "Seed gagal"
  exit 1
}
Write-Ok "Data demo terisi"

# ------------------------------------------
# Done!
# ------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Setup selesai!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Jalankan aplikasi:" -ForegroundColor White
Write-Host "    pnpm dev              (web + server)" -ForegroundColor Yellow
Write-Host "    pnpm dev:web          (frontend saja)" -ForegroundColor Yellow
Write-Host "    pnpm dev:server       (backend saja)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  URLs:" -ForegroundColor White
Write-Host "    Frontend:  http://localhost:3000" -ForegroundColor Yellow
Write-Host "    Backend:   http://localhost:4001" -ForegroundColor Yellow
Write-Host "    Health:    http://localhost:4001/api/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Login Demo:" -ForegroundColor White
Write-Host "    Super Admin:  admin@simrs.id / Admin123!" -ForegroundColor Yellow
Write-Host "    Admin RS:     admin@rs-demo.simrs.id / Demo123!" -ForegroundColor Yellow
Write-Host ""
