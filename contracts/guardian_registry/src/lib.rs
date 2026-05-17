//! Guardian Registry Contract
//!
//! Manages the set of trusted guardians for each wallet and the
//! M-of-N approval threshold required for recovery.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Vec,
};

// ─── Events ───────────────────────────────────────────────────

fn emit_guardian_added(env: &Env, wallet: &Address, guardian: &Address) {
    env.events().publish(
        (symbol_short!("g_added"), wallet.clone()),
        guardian.clone(),
    );
}

fn emit_guardian_removed(env: &Env, wallet: &Address, guardian: &Address) {
    env.events().publish(
        (symbol_short!("g_removed"), wallet.clone()),
        guardian.clone(),
    );
}

fn emit_threshold_updated(env: &Env, wallet: &Address, threshold: u32) {
    env.events().publish(
        (symbol_short!("g_thresh"), wallet.clone()),
        threshold,
    );
}

// ─── Storage keys ─────────────────────────────────────────────

const GUARDIANS: &str = "GUARDIANS";
const THRESHOLD: &str = "THRESHOLD";

// ─── Data types ───────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct GuardianEntry {
    pub address: Address,
    pub added_at: u64,
    pub is_active: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct GuardianConfig {
    pub guardians: Vec<GuardianEntry>,
    pub threshold: u32,
    pub total_guardians: u32,
}

// ─── Contract ─────────────────────────────────────────────────

#[contract]
pub struct GuardianRegistry;

#[contractimpl]
impl GuardianRegistry {
    // ── Add a guardian ────────────────────────────────────────

    pub fn add_guardian(
        env: Env,
        wallet: Address,
        guardian: Address,
    ) {
        // Only the wallet owner may add guardians
        wallet.require_auth();

        let mut guardians = Self::get_guardians(&env, &wallet);

        // Prevent duplicates
        for g in guardians.iter() {
            if g.address == guardian {
                panic!("Guardian already exists");
            }
        }

        guardians.push_back(GuardianEntry {
            address: guardian.clone(),
            added_at: env.ledger().timestamp(),
            is_active: true,
        });

        env.storage()
            .persistent()
            .set(&(GUARDIANS, wallet.clone()), &guardians);

        emit_guardian_added(&env, &wallet, &guardian);
    }

    // ── Remove a guardian ─────────────────────────────────────

    pub fn remove_guardian(
        env: Env,
        wallet: Address,
        guardian: Address,
    ) {
        wallet.require_auth();

        let guardians = Self::get_guardians(&env, &wallet);
        let mut updated: Vec<GuardianEntry> = Vec::new(&env);

        for g in guardians.iter() {
            if g.address != guardian {
                updated.push_back(g);
            }
        }

        // Ensure threshold is still satisfiable
        let threshold = Self::get_threshold(&env, &wallet);
        if (updated.len() as u32) < threshold {
            panic!("Cannot remove: would make threshold unsatisfiable");
        }

        env.storage()
            .persistent()
            .set(&(GUARDIANS, wallet.clone()), &updated);

        emit_guardian_removed(&env, &wallet, &guardian);
    }

    // ── Set approval threshold ────────────────────────────────

    pub fn set_threshold(env: Env, wallet: Address, threshold: u32) {
        wallet.require_auth();

        let guardians = Self::get_guardians(&env, &wallet);
        if threshold == 0 || threshold > guardians.len() as u32 {
            panic!("Invalid threshold");
        }

        env.storage()
            .persistent()
            .set(&(THRESHOLD, wallet.clone()), &threshold);

        emit_threshold_updated(&env, &wallet, threshold);
    }

    // ── List guardians ────────────────────────────────────────

    pub fn list_guardians(env: Env, wallet: Address) -> GuardianConfig {
        let guardians = Self::get_guardians(&env, &wallet);
        let threshold = Self::get_threshold(&env, &wallet);
        let total = guardians.len() as u32;

        GuardianConfig {
            guardians,
            threshold,
            total_guardians: total,
        }
    }

    // ── Check if address is a guardian ────────────────────────

    pub fn is_guardian(env: Env, wallet: Address, address: Address) -> bool {
        let guardians = Self::get_guardians(&env, &wallet);
        for g in guardians.iter() {
            if g.address == address && g.is_active {
                return true;
            }
        }
        false
    }

    // ── Get threshold ─────────────────────────────────────────

    pub fn get_threshold_value(env: Env, wallet: Address) -> u32 {
        Self::get_threshold(&env, &wallet)
    }

    // ─── Internal helpers ─────────────────────────────────────

    fn get_guardians(env: &Env, wallet: &Address) -> Vec<GuardianEntry> {
        env.storage()
            .persistent()
            .get(&(GUARDIANS, wallet))
            .unwrap_or_else(|| Vec::new(env))
    }

    fn get_threshold(env: &Env, wallet: &Address) -> u32 {
        env.storage()
            .persistent()
            .get(&(THRESHOLD, wallet))
            .unwrap_or(2)
    }
}

// ─── Tests ────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::Env;

    #[test]
    fn test_add_and_list_guardians() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, GuardianRegistry);
        let client = GuardianRegistryClient::new(&env, &contract_id);

        let wallet = Address::generate(&env);
        let guardian1 = Address::generate(&env);
        let guardian2 = Address::generate(&env);
        let guardian3 = Address::generate(&env);

        client.add_guardian(&wallet, &guardian1);
        client.add_guardian(&wallet, &guardian2);
        client.add_guardian(&wallet, &guardian3);

        let config = client.list_guardians(&wallet);
        assert_eq!(config.total_guardians, 3);
        assert_eq!(config.threshold, 2); // default
    }

    #[test]
    fn test_set_threshold() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, GuardianRegistry);
        let client = GuardianRegistryClient::new(&env, &contract_id);

        let wallet = Address::generate(&env);
        let g1 = Address::generate(&env);
        let g2 = Address::generate(&env);
        let g3 = Address::generate(&env);

        client.add_guardian(&wallet, &g1);
        client.add_guardian(&wallet, &g2);
        client.add_guardian(&wallet, &g3);
        client.set_threshold(&wallet, &3);

        let config = client.list_guardians(&wallet);
        assert_eq!(config.threshold, 3);
    }

    #[test]
    #[should_panic(expected = "Guardian already exists")]
    fn test_duplicate_guardian_rejected() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, GuardianRegistry);
        let client = GuardianRegistryClient::new(&env, &contract_id);

        let wallet = Address::generate(&env);
        let guardian = Address::generate(&env);

        client.add_guardian(&wallet, &guardian);
        client.add_guardian(&wallet, &guardian); // should panic
    }
}
