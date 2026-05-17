# Soroban Recovery Wallet

A blockchain-based digital wallet built on the [Soroban](https://soroban.stellar.org/) smart contract platform (Stellar ecosystem), featuring social recovery, time-delayed recovery, multi-signature authorization, and emergency freeze capabilities.

---

## Features

- **Social Recovery** — Assign trusted guardians who can collectively authorize wallet recovery
- **Time-Delayed Recovery** — Recovery requests are subject to a configurable time delay, giving the owner a window to cancel fraudulent attempts
- **Multi-Signature Support** — Require M-of-N approvals for high-value transactions
- **Emergency Freeze** — Instantly freeze wallet activity in case of suspected compromise
- **Guardian Registry** — On-chain registry for managing guardian identities and thresholds

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Rust / Soroban SDK |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Zustand, React Query |
| Backend API | Node.js, Express, TypeScript, Zod, Winston |
| Blockchain | Stellar / Soroban (testnet & local) |
| Auth | JWT |
| Containerization | Docker / Docker Compose |

---

## Project Structure

```
soroban-recovery-wallet/
├── contracts/          # Soroban smart contracts (Rust)
│   ├── recovery_wallet/
│   ├── guardian_registry/
│   ├── multisig/
│   └── test/
├── frontend/           # Next.js frontend application
│   └── src/
│       ├── app/        # App Router pages
│       ├── components/ # React components
│       ├── hooks/      # Custom React hooks
│       ├── lib/        # SDK helpers
│       ├── store/      # Zustand state stores
│       └── types/      # TypeScript types
├── backend/            # Express REST API
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── middleware/
│       └── utils/
├── scripts/            # Deployment & utility scripts
└── docs/               # Architecture & API documentation
```

---

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) + `wasm32-unknown-unknown` target
- [Soroban CLI](https://soroban.stellar.org/docs/getting-started/setup) `>= 0.9`
- [Node.js](https://nodejs.org/) `>= 18`
- [Docker](https://www.docker.com/) + Docker Compose
- A Stellar testnet account (funded via [Friendbot](https://friendbot.stellar.org/))

---

## Quick Start

### 1. Clone & configure environment

```bash
git clone https://github.com/your-org/soroban-recovery-wallet.git
cd soroban-recovery-wallet
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
```

Edit `.env` and `frontend/.env.local` with your values.

### 2. Start local Soroban node + services

```bash
docker-compose up -d
```

### 3. Deploy smart contracts

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 4. Install & run frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Install & run backend

```bash
cd backend
npm install
npm run dev
```

Frontend: http://localhost:3000  
Backend API: http://localhost:4000  
Soroban RPC: http://localhost:8000

---

## Smart Contract Deployment

```bash
# Add wasm target
rustup target add wasm32-unknown-unknown

# Build all contracts
cd contracts
cargo build --target wasm32-unknown-unknown --release

# Deploy to testnet
./scripts/deploy.sh --network testnet
```

---

## Running Tests

### Smart Contract Tests
```bash
cd contracts
cargo test
```

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

---

## Recovery Flow Overview

1. Owner assigns 3–5 guardians on-chain via the Guardian Registry contract
2. If owner loses access, any guardian initiates a recovery request
3. A configurable time delay (default: 48 hours) begins
4. If M-of-N guardians approve within the window, recovery executes
5. Owner can cancel the request at any time during the delay period

See [docs/recovery-flow.md](docs/recovery-flow.md) for the full walkthrough.

---

## License

MIT
