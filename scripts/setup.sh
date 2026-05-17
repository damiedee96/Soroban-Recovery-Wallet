#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup.sh — First-time project setup
#
# Usage:
#   ./scripts/setup.sh [--network testnet|local]
#
# What it does:
#   1. Checks prerequisites (Rust, Soroban CLI, Node.js, Docker)
#   2. Copies .env files from examples
#   3. Generates an admin keypair (if not already set)
#   4. Funds the admin account on testnet (optional)
#   5. Installs Node.js dependencies
#   6. Deploys contracts (calls deploy.sh)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

NETWORK="${1:-testnet}"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}✅ $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $1${NC}"; }
error()   { echo -e "${RED}❌ $1${NC}"; exit 1; }
section() { echo -e "\n${YELLOW}── $1 ──${NC}"; }

echo ""
echo "🚀 Soroban Recovery Wallet — First-Time Setup"
echo "   Network: $NETWORK"
echo ""

# ── 1. Check prerequisites ────────────────────────────────────
section "Checking prerequisites"

command -v rustc >/dev/null 2>&1 || error "Rust not found. Install from https://rustup.rs"
info "Rust $(rustc --version)"

if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
  warn "Adding wasm32-unknown-unknown target..."
  rustup target add wasm32-unknown-unknown
fi
info "wasm32 target available"

command -v soroban >/dev/null 2>&1 || error "Soroban CLI not found. Install: cargo install --locked soroban-cli"
info "Soroban CLI $(soroban --version)"

command -v node >/dev/null 2>&1 || error "Node.js not found. Install from https://nodejs.org"
NODE_VERSION=$(node --version | sed 's/v//')
MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$MAJOR" -lt 18 ]; then
  error "Node.js >= 18 required (found $NODE_VERSION)"
fi
info "Node.js v$NODE_VERSION"

command -v docker >/dev/null 2>&1 && info "Docker available" || warn "Docker not found — local node won't work"

# ── 2. Copy .env files ────────────────────────────────────────
section "Setting up environment files"

if [ ! -f ".env" ]; then
  cp .env.example .env
  info "Created .env from .env.example"
else
  info ".env already exists"
fi

if [ ! -f "frontend/.env.local" ]; then
  cp frontend/.env.local.example frontend/.env.local
  info "Created frontend/.env.local"
else
  info "frontend/.env.local already exists"
fi

# ── 3. Generate admin keypair ─────────────────────────────────
section "Admin keypair"

if grep -q "^ADMIN_SECRET_KEY=S" .env 2>/dev/null; then
  info "Admin keypair already configured"
else
  warn "Generating new admin keypair..."
  KEYPAIR_OUTPUT=$(node -e "
    const { Keypair } = require('@stellar/stellar-sdk');
    const kp = Keypair.random();
    console.log(kp.publicKey() + ' ' + kp.secret());
  " 2>/dev/null || echo "")

  if [ -n "$KEYPAIR_OUTPUT" ]; then
    ADMIN_PUBLIC=$(echo "$KEYPAIR_OUTPUT" | cut -d' ' -f1)
    ADMIN_SECRET=$(echo "$KEYPAIR_OUTPUT" | cut -d' ' -f2)

    sed -i "s|^ADMIN_SECRET_KEY=.*|ADMIN_SECRET_KEY=$ADMIN_SECRET|" .env
    sed -i "s|^ADMIN_PUBLIC_KEY=.*|ADMIN_PUBLIC_KEY=$ADMIN_PUBLIC|" .env

    echo ""
    echo "  Public Key : $ADMIN_PUBLIC"
    echo "  Secret Key : $ADMIN_SECRET"
    echo ""
    warn "Save the secret key securely — it is now in .env"
  else
    warn "Could not auto-generate keypair. Run: npx ts-node scripts/generate-keypair.ts --fund"
  fi
fi

# ── 4. Fund on testnet ────────────────────────────────────────
if [ "$NETWORK" = "testnet" ]; then
  section "Funding admin account on testnet"
  ADMIN_PUBLIC=$(grep "^ADMIN_PUBLIC_KEY=" .env | cut -d= -f2)
  if [ -n "$ADMIN_PUBLIC" ] && [ "$ADMIN_PUBLIC" != "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" ]; then
    echo "  Requesting testnet funds for $ADMIN_PUBLIC..."
    curl -s "https://friendbot.stellar.org?addr=$ADMIN_PUBLIC" > /dev/null && info "Account funded" || warn "Friendbot request failed (account may already be funded)"
  else
    warn "ADMIN_PUBLIC_KEY not set — skipping Friendbot"
  fi
fi

# ── 5. Install dependencies ───────────────────────────────────
section "Installing Node.js dependencies"

echo "  Installing backend dependencies..."
(cd backend && npm install --silent)
info "Backend dependencies installed"

echo "  Installing frontend dependencies..."
(cd frontend && npm install --silent)
info "Frontend dependencies installed"

# ── 6. Deploy contracts ───────────────────────────────────────
section "Deploying smart contracts"

if [ -f "scripts/deploy.sh" ]; then
  chmod +x scripts/deploy.sh
  ./scripts/deploy.sh --network "$NETWORK"
else
  warn "deploy.sh not found — skipping contract deployment"
fi

# ── Done ──────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup complete!"
echo ""
echo "  Start the stack:"
echo "    docker-compose up -d          # local Soroban node"
echo "    cd backend && npm run dev     # API on :4000"
echo "    cd frontend && npm run dev    # UI on :3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
