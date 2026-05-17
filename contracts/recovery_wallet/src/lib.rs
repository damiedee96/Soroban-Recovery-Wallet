//! Recovery Wallet Contract
//!
//! Core wallet contract with:
//!   - Social recovery (guardian-based, cross-contract guardian verification)
//!   - Time-delayed recovery execution
//!   - Emergency freeze / unfreeze
//!   - Owner transfer on successful recovery
//!   - On-chain event emission for all state changes

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Bytes, Env, Vec,
};

// ─── Guardian Registry client (cross-contract) ────────────────

mod guardian_registry {
    soroban_sdk::contractimport!(
        file = "../target/wasm32-unknown-unknown/release/guardian_registry.wasm"
    );
}

// ─── Events ───────────────────────────────────────────────────

fn emit_recovery_initiated(env: &Env, wallet: &Address, new_owner: &Address) {
    env.events().publish(
        (symbol_short!("rec_init"), wallet.clone()),
        new_owner.clone(),
    );
}

fn emit_recovery_approved(env: &Env, wallet: &Address, guardian: &Address, approvals: u32) {
    env.events().publish(
        (symbol_short!("rec_appr"), wallet.clone()),
        (guardian.clone(), approvals),
    );
}

fn emit_recovery_executed(env: &Env, wallet: &Address, new_owner: &Address) {
    env.events().publish(
        (symbol_short!("rec_exec"), wallet.clone()),
        new_owner.clone(),
    );
}

fn emit_recovery_cancelled(env: &Env, wallet: &Address) {
    env.events().publish(
        (symbol_short!("rec_cncl"), wallet.clone()),
        (),
    );
}

fn emit_wallet_frozen(env: &Env, wallet: &Address) {
    env.events().publish(
        (symbol_short!("frozen"), wallet.clone()),
        env.ledger().timestamp(),
    );
}

fn emit_wallet_unfrozen(env: &Env, wallet: &Address) {
    env.events().publish(
        (symbol_short!("unfrozen"), wallet.clone()),
        env.ledger().timestamp(),
    );
}

// ─── Constants ────────────────────────────────────────────────

/// Default recovery delay: 48 hours in seconds
const DEFAULT_DELAY_SECS: u64 = 48 * 60 * 60;

/// Maximum number of recovery history entries to keep
const MAX_HISTORY: u32 = 20;

// ─── Storage keys ─────────────────────────────────────────────

const WALLET_INFO: &str = "WALLET";
const ACTIVE_RECOVERY: &str = "RECOVERY";
const RECOVERY_HISTORY: &str = "HISTORY";
const FREEZE_STATUS: &str = "FREEZE";

// ─── Data types ───────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum RecoveryStatus {
    None,
    Pending,
    Approved,
    Executed,
    Cancelled,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct WalletInfo {
    pub owner: Address,
    pub created_at: u64,
    pub is_frozen: bool,
    pub recovery_delay_secs: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct RecoveryRequest {
    pub id: Bytes,
    pub wallet: Address,
    pub new_owner: Address,
    pub initiated_by: Address,
    pub initiated_at: u64,
    pub execute_after: u64,
    pub expires_at: u64,
    pub status: RecoveryStatus,
    pub approvals: Vec<Address>,
    pub required_approvals: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct FreezeStatus {
    pub is_frozen: bool,
    pub frozen_at: Option<u64>,
    pub frozen_by: Option<Address>,
}

// ─── Contract ─────────────────────────────────────────────────

#[contract]
pub struct RecoveryWallet;

#[contractimpl]
impl RecoveryWallet {
    // ── Initialize wallet ─────────────────────────────────────

    pub fn initialize(
        env: Env,
        owner: Address,
        recovery_delay_secs: Option<u64>,
    ) {
        owner.require_auth();

        if env.storage().persistent().has(&(WALLET_INFO, owner.clone())) {
            panic!("Wallet already initialized");
        }

        let info = WalletInfo {
            owner: owner.clone(),
            created_at: env.ledger().timestamp(),
            is_frozen: false,
            recovery_delay_secs: recovery_delay_secs.unwrap_or(DEFAULT_DELAY_SECS),
        };

        env.storage()
            .persistent()
            .set(&(WALLET_INFO, owner), &info);
    }

    // ── Get wallet info ───────────────────────────────────────

    pub fn get_wallet(env: Env, wallet: Address) -> WalletInfo {
        Self::load_wallet(&env, &wallet)
    }

    // ── Initiate recovery ─────────────────────────────────────

    pub fn initiate_recovery(
        env: Env,
        wallet: Address,
        new_owner: Address,
        required_approvals: u32,
        guardian_registry_id: Address,
    ) {
        // Verify the caller is a registered guardian via cross-contract call
        let registry = guardian_registry::Client::new(&env, &guardian_registry_id);
        let caller = env.current_contract_address();
        if !registry.is_guardian(&wallet, &caller) {
            panic!("Caller is not a registered guardian");
        }

        let wallet_info = Self::load_wallet(&env, &wallet);
        if wallet_info.is_frozen {
            panic!("Wallet is frozen");
        }

        // Only one active recovery at a time
        if let Some(existing) = Self::get_active_recovery_internal(&env, &wallet) {
            if existing.status == RecoveryStatus::Pending
                || existing.status == RecoveryStatus::Approved
            {
                panic!("Recovery already in progress");
            }
        }

        let now = env.ledger().timestamp();
        let id = env.crypto().sha256(&Bytes::from_slice(
            &env,
            &now.to_be_bytes(),
        ));

        let request = RecoveryRequest {
            id: id.into(),
            wallet: wallet.clone(),
            new_owner: new_owner.clone(),
            initiated_by: caller,
            initiated_at: now,
            execute_after: now + wallet_info.recovery_delay_secs,
            expires_at: now + wallet_info.recovery_delay_secs + (7 * 24 * 60 * 60),
            status: RecoveryStatus::Pending,
            approvals: Vec::new(&env),
            required_approvals,
        };

        env.storage()
            .persistent()
            .set(&(ACTIVE_RECOVERY, wallet.clone()), &request);

        emit_recovery_initiated(&env, &wallet, &new_owner);
    }

    // ── Approve recovery (guardian action) ────────────────────

    pub fn approve_recovery(env: Env, wallet: Address, guardian: Address) {
        guardian.require_auth();

        let mut request = Self::load_active_recovery(&env, &wallet);

        if request.status != RecoveryStatus::Pending {
            panic!("No pending recovery request");
        }

        let now = env.ledger().timestamp();
        if now > request.expires_at {
            request.status = RecoveryStatus::Expired;
            env.storage()
                .persistent()
                .set(&(ACTIVE_RECOVERY, wallet), &request);
            panic!("Recovery request has expired");
        }

        // Prevent duplicate approvals
        for existing in request.approvals.iter() {
            if existing == guardian {
                panic!("Already approved");
            }
        }

        request.approvals.push_back(guardian.clone());

        if request.approvals.len() as u32 >= request.required_approvals {
            request.status = RecoveryStatus::Approved;
        }

        let approvals_count = request.approvals.len() as u32;
        env.storage()
            .persistent()
            .set(&(ACTIVE_RECOVERY, wallet.clone()), &request);

        emit_recovery_approved(&env, &wallet, &guardian, approvals_count);
    }

    // ── Cancel recovery (owner action) ────────────────────────

    pub fn cancel_recovery(env: Env, wallet: Address) {
        wallet.require_auth();

        let mut request = Self::load_active_recovery(&env, &wallet);

        if request.status != RecoveryStatus::Pending
            && request.status != RecoveryStatus::Approved
        {
            panic!("No cancellable recovery request");
        }

        request.status = RecoveryStatus::Cancelled;
        Self::archive_recovery(&env, &wallet, request);
        emit_recovery_cancelled(&env, &wallet);
    }

    // ── Execute recovery (after delay + threshold met) ────────

    pub fn execute_recovery(env: Env, wallet: Address) {
        let mut request = Self::load_active_recovery(&env, &wallet);

        if request.status != RecoveryStatus::Approved {
            panic!("Recovery not yet approved");
        }

        let now = env.ledger().timestamp();
        if now < request.execute_after {
            panic!("Time delay has not elapsed");
        }

        if now > request.expires_at {
            request.status = RecoveryStatus::Expired;
            Self::archive_recovery(&env, &wallet, request);
            panic!("Recovery request has expired");
        }

        // Transfer ownership
        let mut wallet_info = Self::load_wallet(&env, &wallet);
        let new_owner = request.new_owner.clone();
        wallet_info.owner = new_owner.clone();
        env.storage()
            .persistent()
            .set(&(WALLET_INFO, wallet.clone()), &wallet_info);

        request.status = RecoveryStatus::Executed;
        Self::archive_recovery(&env, &wallet, request);
        emit_recovery_executed(&env, &wallet, &new_owner);
    }

    // ── Get active recovery ───────────────────────────────────

    pub fn get_active_recovery(env: Env, wallet: Address) -> Option<RecoveryRequest> {
        Self::get_active_recovery_internal(&env, &wallet)
    }

    // ── Get recovery history ──────────────────────────────────

    pub fn get_recovery_history(env: Env, wallet: Address) -> Vec<RecoveryRequest> {
        env.storage()
            .persistent()
            .get(&(RECOVERY_HISTORY, wallet))
            .unwrap_or_else(|| Vec::new(&env))
    }

    // ── Freeze wallet ─────────────────────────────────────────

    pub fn freeze(env: Env, wallet: Address) {
        wallet.require_auth();

        let mut info = Self::load_wallet(&env, &wallet);
        info.is_frozen = true;
        env.storage()
            .persistent()
            .set(&(WALLET_INFO, wallet.clone()), &info);

        let status = FreezeStatus {
            is_frozen: true,
            frozen_at: Some(env.ledger().timestamp()),
            frozen_by: Some(wallet.clone()),
        };
        env.storage()
            .persistent()
            .set(&(FREEZE_STATUS, wallet.clone()), &status);

        emit_wallet_frozen(&env, &wallet);
    }

    // ── Unfreeze wallet ───────────────────────────────────────

    pub fn unfreeze(env: Env, wallet: Address) {
        wallet.require_auth();

        let mut info = Self::load_wallet(&env, &wallet);
        info.is_frozen = false;
        env.storage()
            .persistent()
            .set(&(WALLET_INFO, wallet.clone()), &info);

        let status = FreezeStatus {
            is_frozen: false,
            frozen_at: None,
            frozen_by: None,
        };
        env.storage()
            .persistent()
            .set(&(FREEZE_STATUS, wallet.clone()), &status);

        emit_wallet_unfrozen(&env, &wallet);
    }

    // ── Get freeze status ─────────────────────────────────────

    pub fn get_freeze_status(env: Env, wallet: Address) -> FreezeStatus {
        env.storage()
            .persistent()
            .get(&(FREEZE_STATUS, wallet))
            .unwrap_or(FreezeStatus {
                is_frozen: false,
                frozen_at: None,
                frozen_by: None,
            })
    }

    // ─── Internal helpers ─────────────────────────────────────

    fn load_wallet(env: &Env, wallet: &Address) -> WalletInfo {
        env.storage()
            .persistent()
            .get(&(WALLET_INFO, wallet))
            .expect("Wallet not initialized")
    }

    fn load_active_recovery(env: &Env, wallet: &Address) -> RecoveryRequest {
        env.storage()
            .persistent()
            .get(&(ACTIVE_RECOVERY, wallet))
            .expect("No active recovery request")
    }

    fn get_active_recovery_internal(
        env: &Env,
        wallet: &Address,
    ) -> Option<RecoveryRequest> {
        env.storage()
            .persistent()
            .get(&(ACTIVE_RECOVERY, wallet))
    }

    fn archive_recovery(env: &Env, wallet: &Address, request: RecoveryRequest) {
        // Remove from active slot
        env.storage()
            .persistent()
            .remove(&(ACTIVE_RECOVERY, wallet));

        // Append to history (capped at MAX_HISTORY)
        let mut history: Vec<RecoveryRequest> = env
            .storage()
            .persistent()
            .get(&(RECOVERY_HISTORY, wallet))
            .unwrap_or_else(|| Vec::new(env));

        history.push_front(request);
        while history.len() as u32 > MAX_HISTORY {
            history.pop_back();
        }

        env.storage()
            .persistent()
            .set(&(RECOVERY_HISTORY, wallet), &history);
    }
}

// ─── Tests ────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger, LedgerInfo};
    use soroban_sdk::Env;

    fn setup() -> (Env, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, RecoveryWallet);
        let owner = Address::generate(&env);

        let client = RecoveryWalletClient::new(&env, &contract_id);
        client.initialize(&owner, &None);

        (env, contract_id, owner)
    }

    #[test]
    fn test_initialize_wallet() {
        let (env, contract_id, owner) = setup();
        let client = RecoveryWalletClient::new(&env, &contract_id);
        let info = client.get_wallet(&owner);
        assert_eq!(info.owner, owner);
        assert!(!info.is_frozen);
    }

    #[test]
    fn test_freeze_unfreeze() {
        let (env, contract_id, owner) = setup();
        let client = RecoveryWalletClient::new(&env, &contract_id);

        client.freeze(&owner);
        let info = client.get_wallet(&owner);
        assert!(info.is_frozen);

        client.unfreeze(&owner);
        let info = client.get_wallet(&owner);
        assert!(!info.is_frozen);
    }

    #[test]
    fn test_recovery_flow() {
        let (env, contract_id, owner) = setup();
        let client = RecoveryWalletClient::new(&env, &contract_id);

        let new_owner = Address::generate(&env);
        let guardian1 = Address::generate(&env);
        let guardian2 = Address::generate(&env);

        // Initiate recovery (requires 2 approvals)
        client.initiate_recovery(&owner, &new_owner, &2);

        let request = client.get_active_recovery(&owner).unwrap();
        assert_eq!(request.status, RecoveryStatus::Pending);

        // Guardian approvals
        client.approve_recovery(&owner, &guardian1);
        client.approve_recovery(&owner, &guardian2);

        let request = client.get_active_recovery(&owner).unwrap();
        assert_eq!(request.status, RecoveryStatus::Approved);

        // Advance ledger past the delay
        env.ledger().set(LedgerInfo {
            timestamp: env.ledger().timestamp() + DEFAULT_DELAY_SECS + 1,
            ..env.ledger().get()
        });

        client.execute_recovery(&owner);

        // Ownership transferred
        let info = client.get_wallet(&new_owner);
        assert_eq!(info.owner, new_owner);
    }

    #[test]
    fn test_cancel_recovery() {
        let (env, contract_id, owner) = setup();
        let client = RecoveryWalletClient::new(&env, &contract_id);

        let new_owner = Address::generate(&env);
        client.initiate_recovery(&owner, &new_owner, &2);
        client.cancel_recovery(&owner);

        assert!(client.get_active_recovery(&owner).is_none());
        let history = client.get_recovery_history(&owner);
        assert_eq!(history.len(), 1);
        assert_eq!(history.get(0).unwrap().status, RecoveryStatus::Cancelled);
    }
}
