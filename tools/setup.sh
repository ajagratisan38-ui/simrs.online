#!/bin/bash
# ============================================
# SIMRS SaaS — Setup Script (Linux/Mac)
# Jalankan: chmod +x tools/setup.sh && ./tools/setup.sh
# ============================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${CYAN}[$1] $2${NC}"; }
ok() { echo -e "  ${GREEN}OK: $1${NC}"; }
fail() { echo -e "  ${RED}GAGAL: $1${NC}"; exit 1; }

echo ""
echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}  SIMRS SaaS - Setup Development Environment${NC}"
echo -e "${YELLOW}============================================${NC}"

# 1. Cek prerequisites
step "1/7" "Mengecek prerequisites..."

command -v node >/dev/null 2>&1 || fail "Node.js belum terinstall"
NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
[ "$NODE_MAJOR" -ge 20 ] && ok "Node.js $(node -v)" || fail "Node.js >= 20 dibutuhkan"

command -v pnpm >/dev/null 2>&1 && ok "pnpm $(pnpm -v)" || fail "pnpm belum terinstall. Jalankan: npm i -g pnpm"
command -v docker >/dev/null 2>&1 && ok "Docker $(docker --version)" || fail "Docker belum terinstall"
docker info >/dev/null 2>&1 && ok "Docker daemon berjalan" || fail "Docker belum berjalan"
command -v git >/dev/null 2>&1 && ok "$(git --version)" || fail "Git belum terinstall"

# 2. Copy .env
step "2/7" "Menyiapkan file .env..."
if [ ! -f .env ]; then
  cp .env.example .env
  ok "File .env dibuat dari .env.example"
else
  ok "File .env sudah ada, skip"
fi

# 3. Install dependencies
step "3/7" "Menginstall dependencies..."
pnpm install
ok "Dependencies terinstall"

# 4. Start Docker
step "4/7" "Menjalankan Docker containers..."
docker-compose up -d
ok "Containers berjalan"

# 5. Tunggu PostgreSQL
step "5/7" "Menunggu PostgreSQL siap..."
RETRIES=30
until docker exec simrs-postgres pg_isready -U simrs -d simrs_db >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  echo "  Menunggu... ($((30 - RETRIES + 1))/30)"
  RETRIES=$((RETRIES - 1))
  sleep 2
done
[ $RETRIES -gt 0 ] && ok "PostgreSQL siap" || fail "PostgreSQL timeout"

# 6. Migrations
step "6/7" "Menjalankan database migrations..."
pnpm db:migrate
ok "Migrations berhasil"

# 7. Seeds
step "7/7" "Mengisi data demo..."
pnpm db:seed
ok "Data demo terisi"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Setup selesai!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  Jalankan aplikasi:"
echo -e "    ${YELLOW}pnpm dev${NC}              (web + server)"
echo -e "    ${YELLOW}pnpm dev:web${NC}          (frontend saja)"
echo -e "    ${YELLOW}pnpm dev:server${NC}       (backend saja)"
echo ""
echo -e "  URLs:"
echo -e "    ${YELLOW}Frontend:  http://localhost:3000${NC}"
echo -e "    ${YELLOW}Backend:   http://localhost:4001${NC}"
echo ""
echo -e "  Login Demo:"
echo -e "    ${YELLOW}Super Admin:  admin@simrs.id / Admin123!${NC}"
echo -e "    ${YELLOW}Admin RS:     admin@rs-demo.simrs.id / Demo123!${NC}"
echo ""
