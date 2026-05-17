# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Mobile                      │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              Next.js Frontend (React)                │  │
│   │                                                     │  │
│   │  WalletConnect  │  Dashboard  │  Guardian Manager   │  │
│   │  Recovery Panel │  MultiSig   │  Security Panel     │  │
│   │                                                     │  │
│   │  Zustand Store  │  React Query │  Stellar SDK       │  │
│   └──────────────────────┬──────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP / REST
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express Backend API                        │
│                                                             │
│   /api/wallet    /api/guardian    /api/recovery             │
│   /api/multisig                                             │
│                                                             │
│   Auth (JWT)  │  Rate Limiting  │  Zod Validation          │
└──────────────────────────┬──────────────────────────────────┘
                           │ Soroban RPC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Stellar / Soroban Network                   │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  RecoveryWallet  │  │ GuardianRegistry  │                │
│  │  Contract        │  │ Contract          │                │
│  │                  │  │                   │                │
│  │  - initialize    │  │  - add_guardian   │                │
│  │  - freeze        │  │  - remove_guardian│                │
│  │  - unfreeze      │  │  - set_threshold  │                │
│  │  - initiate_rec  │  │  - list_guardians │                │
│  │  - approve_rec   │  │  - is_guardian    │                │
│  │  - cancel_rec    │  └──────────────────┘                │
│  │  - execute_rec   │                                       │
│  └──────────────────┘  ┌──────────────────┐                │
│                         │  MultiSig        │                │
│                         │  Contract        │                │
│                         │                  │                │
│                         │  - configure     │                │
│                         │  - create_prop   │                │
│                         │  - approve_prop  │                │
│                         │  - reject_prop   │                │
│                         │  - execute_prop  │                │
│                         └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Wallet Connection
1. User enters secret key in browser
2. Frontend derives public key client-side
3. Fetches balance from Horizon API
4. Secret key held in memory only (never persisted, never sent to backend)

### Guardian Management
1. Frontend calls backend `/api/guardian/:wallet/add`
2. Backend validates input with Zod
3. Backend invokes `GuardianRegistry.add_guardian` via Soroban RPC
4. Transaction signed with user's secret key (passed in request body over HTTPS)
5. Frontend polls for updated guardian list

### Recovery Flow
See [recovery-flow.md](./recovery-flow.md)

### Multi-Sig Flow
1. Owner creates proposal via `MultiSig.create_proposal`
2. Signers independently call `approve_proposal` or `reject_proposal`
3. Once threshold met, any signer calls `execute_proposal`
4. Contract executes the token transfer

## Security Considerations

- Secret keys are never stored server-side
- All contract calls are signed client-side or with keys passed over HTTPS
- JWT tokens authenticate API requests (wallet address as subject)
- Rate limiting prevents brute-force attacks
- Helmet.js sets security headers
- Zod validates all API inputs
- Smart contracts use `require_auth()` for all state-changing operations
