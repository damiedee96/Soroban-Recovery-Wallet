# API Reference

Base URL: `http://localhost:4000`

All responses follow the shape:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "message" }
```

---

## Authentication

### `GET /api/wallet/challenge`
Get a one-time challenge string to sign for authentication.

**Response**
```json
{
  "success": true,
  "data": { "challenge": "soroban-recovery-wallet:1716000000000:abc123" }
}
```

---

### `POST /api/wallet/auth`
Verify a signed challenge and receive a JWT.

**Body**
```json
{
  "publicKey": "G...",
  "signature": "<hex-encoded signature of challenge>",
  "challenge": "soroban-recovery-wallet:..."
}
```

**Response**
```json
{
  "success": true,
  "data": { "token": "<jwt>", "publicKey": "G..." }
}
```

Include the JWT in subsequent requests:
```
Authorization: Bearer <token>
```

---

## Wallet

### `GET /api/wallet/:address`
Get wallet info for a Stellar address.

**Response**
```json
{
  "success": true,
  "data": {
    "address": "G...",
    "publicKey": "G...",
    "balance": "100.0000000",
    "isFrozen": false,
    "createdAt": 1716000000000,
    "owner": "G..."
  }
}
```

---

## Guardian Registry

### `GET /api/guardian/:walletAddress?caller=G...`
List all guardians and the current threshold for a wallet.

**Response**
```json
{
  "success": true,
  "data": {
    "guardians": [
      { "address": "G...", "addedAt": 1716000000, "isActive": true }
    ],
    "threshold": 2,
    "totalGuardians": 3
  }
}
```

---

### `POST /api/guardian/:walletAddress/add`
Add a guardian to the wallet.

**Body**
```json
{
  "guardianAddress": "G...",
  "signerSecretKey": "S..."
}
```

**Response**
```json
{ "success": true, "data": { "txHash": "abc...", "success": true } }
```

---

### `POST /api/guardian/:walletAddress/remove`
Remove a guardian from the wallet.

**Body**
```json
{
  "guardianAddress": "G...",
  "signerSecretKey": "S..."
}
```

---

### `POST /api/guardian/:walletAddress/threshold`
Update the M-of-N approval threshold.

**Body**
```json
{
  "threshold": 2,
  "signerSecretKey": "S..."
}
```

---

## Recovery

### `GET /api/recovery/:walletAddress/active?caller=G...`
Get the active recovery request, if any.

**Response**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "walletAddress": "G...",
    "newOwner": "G...",
    "initiatedBy": "G...",
    "initiatedAt": 1716000000,
    "executeAfter": 1716172800,
    "expiresAt": 1716777600,
    "status": "pending",
    "approvals": [],
    "requiredApprovals": 2
  }
}
```

Returns `null` in `data` if no active request.

---

### `GET /api/recovery/:walletAddress/history?caller=G...`
Get past recovery requests.

---

### `POST /api/recovery/:walletAddress/initiate`
Initiate a recovery request (caller must be a registered guardian).

**Body**
```json
{
  "newOwner": "G...",
  "signerSecretKey": "S..."
}
```

---

### `POST /api/recovery/:walletAddress/approve`
Approve a pending recovery request (guardian action).

**Body**
```json
{
  "requestId": "...",
  "guardianSecretKey": "S..."
}
```

---

### `POST /api/recovery/:walletAddress/cancel`
Cancel the active recovery request (owner action).

**Body**
```json
{ "signerSecretKey": "S..." }
```

---

### `POST /api/recovery/:walletAddress/execute`
Execute recovery after delay + threshold met.

**Body**
```json
{ "signerSecretKey": "S..." }
```

---

## Multi-Signature

### `GET /api/multisig/:walletAddress/proposals?caller=G...`
List all proposals for a wallet.

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "walletAddress": "G...",
      "proposedBy": "G...",
      "proposedAt": 1716000000,
      "expiresAt": 1716604800,
      "status": "open",
      "approvals": [],
      "rejections": [],
      "requiredApprovals": 2,
      "transaction": {
        "destination": "G...",
        "amount": "100",
        "asset": "XLM",
        "memo": null
      }
    }
  ]
}
```

---

### `POST /api/multisig/:walletAddress/propose`
Create a new multi-sig proposal.

**Body**
```json
{
  "destination": "G...",
  "amount": "100",
  "asset": "XLM",
  "memo": "Payment ref",
  "signerSecretKey": "S..."
}
```

---

### `POST /api/multisig/:walletAddress/approve`
Approve a proposal.

**Body**
```json
{
  "proposalId": "...",
  "signerSecretKey": "S..."
}
```

---

### `POST /api/multisig/:walletAddress/execute`
Execute an approved proposal.

**Body**
```json
{
  "proposalId": "...",
  "signerSecretKey": "S..."
}
```

---

## Error Codes

| HTTP Status | Meaning |
|---|---|
| 400 | Bad request / validation error |
| 401 | Missing or invalid JWT / signature |
| 404 | Route not found |
| 429 | Rate limit exceeded (200 req / 15 min) |
| 500 | Internal server error |

---

## Rate Limits

- 200 requests per 15-minute window per IP
- Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

---

## Contract Events

The Soroban contracts emit the following events (subscribe via Horizon event stream):

| Event | Contract | Topic | Data |
|---|---|---|---|
| `rec_init` | RecoveryWallet | `(rec_init, walletAddress)` | `newOwner` |
| `rec_appr` | RecoveryWallet | `(rec_appr, walletAddress)` | `(guardian, approvalCount)` |
| `rec_exec` | RecoveryWallet | `(rec_exec, walletAddress)` | `newOwner` |
| `rec_cncl` | RecoveryWallet | `(rec_cncl, walletAddress)` | `()` |
| `frozen` | RecoveryWallet | `(frozen, walletAddress)` | `timestamp` |
| `unfrozen` | RecoveryWallet | `(unfrozen, walletAddress)` | `timestamp` |
| `g_added` | GuardianRegistry | `(g_added, walletAddress)` | `guardianAddress` |
| `g_removed` | GuardianRegistry | `(g_removed, walletAddress)` | `guardianAddress` |
| `g_thresh` | GuardianRegistry | `(g_thresh, walletAddress)` | `threshold` |
| `p_create` | MultiSig | `(p_create, walletAddress)` | `proposalId` |
| `p_appr` | MultiSig | `(p_appr, walletAddress)` | `(proposalId, signer)` |
| `p_rej` | MultiSig | `(p_rej, walletAddress)` | `(proposalId, signer)` |
| `p_exec` | MultiSig | `(p_exec, walletAddress)` | `proposalId` |
