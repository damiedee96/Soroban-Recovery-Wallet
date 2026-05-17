#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Build and deploy all Soroban contracts
#
# Usage:
#   ./scripts/deploy.sh [--network testnet|local|mainnet]
#
# Prerequisites:
#   - Rust + wasm32-unknown-unknown target
#   - Soroban CLI >= 0.9
#   - ADMIN_SECRET_KEY set in .env or environment
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Load .env if present ──────────────────────────────────────
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# ── Parse arguments ───────────────────────────────────────────
NETWORK="${STELLAR_NETWORK:-testnet}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --network) NETWORK="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

echo "🚀 Deploying to network: $NETWORK"

# ── Network config ────────────────────────────────────────────
case "$NETWORK" in
  local)
    RPC_URL="http://localhost:8000/soroban/rpc"
    NETWORK_PASSPHRASE="Standalone Network ; February 2017"
    ;;
  testnet)
    RPC_URL="https://soroban-testnet.stellar.org"
    NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
    ;;
  mainnet)
    RPC_URL="https://mainnet.sorobanrpc.com"
    NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
    ;;
  *)
    echo "❌ Unknown network: $NETWORK"
    exit 1
    ;;
esac

if [ -z "${ADMIN_SECRET_KEY:-}" ]; then
  echo "❌ ADMIN_SECRET_KEY is not set"
  exit 1
fi

# ── Build contracts ───────────────────────────────────────────
echo ""
echo "📦 Building contracts..."
cd contracts
cargo build --target wasm32-unknown-unknown --release
cd ..

WASM_DIR="contracts/target/wasm32-unknown-unknown/release"

# ── Deploy helper function ────────────────────────────────────
deploy_contract() {
  local name="$1"
  local wasm="$2"

  echo ""
  echo "📤 Deploying $name..."

  CONTRACT_ID=$(soroban contract deploy \
    --wasm "$wasm" \
    --source "$ADMIN_SECRET_KEY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE")

  echo "   ✅ $name deployed: $CONTRACT_ID"
  echo "$CONTRACT_ID"
}

# ── Deploy all contracts ──────────────────────────────────────
GUARDIAN_REGISTRY_ID=$(deploy_contract "GuardianRegistry" \
  "$WASM_DIR/guardian_registry.wasm")

RECOVERY_WALLET_ID=$(deploy_contract "RecoveryWallet" \
  "$WASM_DIR/recovery_wallet.wasm")

MULTISIG_ID=$(deploy_contract "MultiSig" \
  "$WASM_DIR/multisig.wasm")

# ── Write contract IDs to .env ────────────────────────────────
echo ""
echo "📝 Writing contract IDs to .env..."

update_env() {
  local key="$1"
  local value="$2"
  if grep -q "^$key=" .env 2>/dev/null; then
    sed -i "s|^$key=.*|$key=$value|" .env
  else
    echo "$key=$value" >> .env
  fi
}

update_env "RECOVERY_WALLET_CONTRACT_ID" "$RECOVERY_WALLET_ID"
update_env "GUARDIAN_REGISTRY_CONTRACT_ID" "$GUARDIAN_REGISTRY_ID"
update_env "MULTISIG_CONTRACT_ID" "$MULTISIG_ID"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Contract IDs:"
echo "  RECOVERY_WALLET_CONTRACT_ID  = $RECOVERY_WALLET_ID"
echo "  GUARDIAN_REGISTRY_CONTRACT_ID = $GUARDIAN_REGISTRY_ID"
echo "  MULTISIG_CONTRACT_ID          = $MULTISIG_ID"
echo ""
echo "Next: copy these values to frontend/.env.local"
