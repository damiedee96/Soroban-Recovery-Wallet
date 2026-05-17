# Recovery Flow

This document describes the end-to-end social recovery process for the Soroban Recovery Wallet.

---

## Overview

The recovery system allows a wallet owner to regain access through a set of trusted guardians, without relying on a seed phrase or centralized authority.

```
Owner loses access
       │
       ▼
Guardian initiates recovery request
       │
       ▼
Time delay begins (default: 48 hours)
       │
       ├── Owner can CANCEL at any time during delay
       │
       ▼
M-of-N guardians approve the request
       │
       ▼
Delay elapses → Recovery can be executed
       │
       ▼
Wallet ownership transferred to new address
```

---

## Step-by-Step

### 1. Setup (before loss of access)

The wallet owner assigns 3–5 trusted guardians via the Guardian Registry contract:

```bash
soroban contract invoke \
  --id $GUARDIAN_REGISTRY_CONTRACT_ID \
  --fn add_guardian \
  -- \
  --wallet $WALLET_ADDRESS \
  --guardian $GUARDIAN_1_ADDRESS
```

Set the approval threshold (e.g., 2-of-3):

```bash
soroban contract invoke \
  --id $GUARDIAN_REGISTRY_CONTRACT_ID \
  --fn set_threshold \
  -- \
  --wallet $WALLET_ADDRESS \
  --threshold 2
```

### 2. Initiate Recovery

Any guardian (or the owner from a new device) initiates a recovery request:

```bash
soroban contract invoke \
  --id $RECOVERY_WALLET_CONTRACT_ID \
  --fn initiate_recovery \
  -- \
  --wallet $WALLET_ADDRESS \
  --new_owner $NEW_OWNER_ADDRESS \
  --required_approvals 2
```

This starts the **48-hour time delay window**.

### 3. Guardian Approvals

Each guardian approves the request independently:

```bash
soroban contract invoke \
  --id $RECOVERY_WALLET_CONTRACT_ID \
  --fn approve_recovery \
  --source $GUARDIAN_SECRET_KEY \
  -- \
  --wallet $WALLET_ADDRESS \
  --guardian $GUARDIAN_ADDRESS
```

Once M approvals are collected, the request status changes to `Approved`.

### 4. Cancel (if fraudulent)

If the owner still has access and did not initiate the request, they can cancel:

```bash
soroban contract invoke \
  --id $RECOVERY_WALLET_CONTRACT_ID \
  --fn cancel_recovery \
  --source $OWNER_SECRET_KEY \
  -- \
  --wallet $WALLET_ADDRESS
```

### 5. Execute Recovery

After the delay has elapsed and the threshold is met:

```bash
soroban contract invoke \
  --id $RECOVERY_WALLET_CONTRACT_ID \
  --fn execute_recovery \
  -- \
  --wallet $WALLET_ADDRESS
```

Wallet ownership is transferred to the `new_owner` address.

---

## Security Properties

| Property | Mechanism |
|---|---|
| Guardian collusion resistance | Time delay gives owner a window to cancel |
| Single guardian compromise | M-of-N threshold prevents unilateral recovery |
| Replay attacks | Each request has a unique ID and expiry |
| Frozen wallet recovery | Freeze does not block recovery initiation |
| Expired requests | Requests expire after delay + 7 days |

---

## Timing Parameters

| Parameter | Default | Configurable |
|---|---|---|
| Recovery delay | 48 hours | Yes (per wallet) |
| Request expiry | Delay + 7 days | No |
| Guardian approval window | Until expiry | — |

---

## Guardian Best Practices

- Use 3–5 guardians for optimal security/usability balance
- Guardians should be people you trust but who don't know each other
- Consider geographic distribution to reduce coordinated attack risk
- Test the recovery flow on testnet before relying on it
- Rotate guardians if any become compromised
