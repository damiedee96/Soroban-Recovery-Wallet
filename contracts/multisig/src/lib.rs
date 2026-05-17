//! Multi-Signature Contract
//!
//! Enables M-of-N approval for sensitive transactions.
//! Signers propose, approve/reject, and execute transactions.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Bytes, BytesN, Env, String, Vec,
};

// ─── Storage keys ─────────────────────────────────────────────

const PROPOSALS: &str = "PROPOSALS";
const SIGNERS: &str = "SIGNERS";
const THRESHOLD: &str = "THRESHOLD";

// ─── Data types ───────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    Open,
    Approved,
    Executed,
    Rejected,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TxDetails {
    pub destination: Address,
    pub amount: String,
    pub asset: String,
    pub memo: Option<String>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub id: BytesN<32>,
    pub wallet: Address,
    pub proposed_by: Address,
    pub proposed_at: u64,
    pub expires_at: u64,
    pub status: ProposalStatus,
    pub approvals: Vec<Address>,
    pub rejections: Vec<Address>,
    pub required_approvals: u32,
    pub transaction: TxDetails,
}

// ─── Contract ─────────────────────────────────────────────────

#[contract]
pub struct MultiSig;

#[contractimpl]
impl MultiSig {
    // ── Configure signers & threshold ─────────────────────────

    pub fn configure(
        env: Env,
        wallet: Address,
        signers: Vec<Address>,
        threshold: u32,
    ) {
        wallet.require_auth();

        if threshold == 0 || threshold > signers.len() as u32 {
            panic!("Invalid threshold");
        }

        env.storage()
            .persistent()
            .set(&(SIGNERS, wallet.clone()), &signers);
        env.storage()
            .persistent()
            .set(&(THRESHOLD, wallet), &threshold);
    }

    // ── Create proposal ───────────────────────────────────────

    pub fn create_proposal(
        env: Env,
        wallet: Address,
        destination: Address,
        amount: String,
        asset: String,
    ) -> BytesN<32> {
        wallet.require_auth();

        let now = env.ledger().timestamp();
        let id: BytesN<32> = env
            .crypto()
            .sha256(&Bytes::from_slice(&env, &now.to_be_bytes()))
            .into();

        let threshold = Self::get_threshold(&env, &wallet);

        let proposal = Proposal {
            id: id.clone(),
            wallet: wallet.clone(),
            proposed_by: wallet.clone(),
            proposed_at: now,
            expires_at: now + (7 * 24 * 60 * 60), // 7 days
            status: ProposalStatus::Open,
            approvals: Vec::new(&env),
            rejections: Vec::new(&env),
            required_approvals: threshold,
            transaction: TxDetails {
                destination,
                amount,
                asset,
                memo: None,
            },
        };

        let mut proposals = Self::get_proposals(&env, &wallet);
        proposals.push_back(proposal);
        env.storage()
            .persistent()
            .set(&(PROPOSALS, wallet), &proposals);

        id
    }

    // ── Approve proposal ──────────────────────────────────────

    pub fn approve_proposal(env: Env, wallet: Address, proposal_id: BytesN<32>, signer: Address) {
        signer.require_auth();
        Self::require_signer(&env, &wallet, &signer);

        let mut proposals = Self::get_proposals(&env, &wallet);
        let mut updated = Vec::new(&env);

        for mut p in proposals.iter() {
            if p.id == proposal_id {
                if p.status != ProposalStatus::Open {
                    panic!("Proposal is not open");
                }
                Self::check_not_expired(&env, &p);

                // Prevent duplicate approvals
                for a in p.approvals.iter() {
                    if a == signer {
                        panic!("Already approved");
                    }
                }

                p.approvals.push_back(signer.clone());

                if p.approvals.len() as u32 >= p.required_approvals {
                    p.status = ProposalStatus::Approved;
                }
            }
            updated.push_back(p);
        }

        env.storage()
            .persistent()
            .set(&(PROPOSALS, wallet), &updated);
    }

    // ── Reject proposal ───────────────────────────────────────

    pub fn reject_proposal(env: Env, wallet: Address, proposal_id: BytesN<32>, signer: Address) {
        signer.require_auth();
        Self::require_signer(&env, &wallet, &signer);

        let mut proposals = Self::get_proposals(&env, &wallet);
        let mut updated = Vec::new(&env);

        for mut p in proposals.iter() {
            if p.id == proposal_id {
                if p.status != ProposalStatus::Open {
                    panic!("Proposal is not open");
                }
                p.rejections.push_back(signer.clone());

                // If majority rejects, mark as rejected
                let total_signers = Self::get_signers(&env, &wallet).len() as u32;
                let rejections_needed = total_signers - p.required_approvals + 1;
                if p.rejections.len() as u32 >= rejections_needed {
                    p.status = ProposalStatus::Rejected;
                }
            }
            updated.push_back(p);
        }

        env.storage()
            .persistent()
            .set(&(PROPOSALS, wallet), &updated);
    }

    // ── Execute proposal ──────────────────────────────────────

    pub fn execute_proposal(env: Env, wallet: Address, proposal_id: BytesN<32>) {
        wallet.require_auth();

        let mut proposals = Self::get_proposals(&env, &wallet);
        let mut updated = Vec::new(&env);

        for mut p in proposals.iter() {
            if p.id == proposal_id {
                if p.status != ProposalStatus::Approved {
                    panic!("Proposal not approved");
                }
                Self::check_not_expired(&env, &p);

                // In production: invoke token transfer here
                // token_client.transfer(&wallet, &p.transaction.destination, &amount);

                p.status = ProposalStatus::Executed;
            }
            updated.push_back(p);
        }

        env.storage()
            .persistent()
            .set(&(PROPOSALS, wallet), &updated);
    }

    // ── List proposals ────────────────────────────────────────

    pub fn list_proposals(env: Env, wallet: Address) -> Vec<Proposal> {
        Self::get_proposals(&env, &wallet)
    }

    // ─── Internal helpers ─────────────────────────────────────

    fn get_proposals(env: &Env, wallet: &Address) -> Vec<Proposal> {
        env.storage()
            .persistent()
            .get(&(PROPOSALS, wallet))
            .unwrap_or_else(|| Vec::new(env))
    }

    fn get_signers(env: &Env, wallet: &Address) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&(SIGNERS, wallet))
            .unwrap_or_else(|| Vec::new(env))
    }

    fn get_threshold(env: &Env, wallet: &Address) -> u32 {
        env.storage()
            .persistent()
            .get(&(THRESHOLD, wallet))
            .unwrap_or(2)
    }

    fn require_signer(env: &Env, wallet: &Address, signer: &Address) {
        let signers = Self::get_signers(env, wallet);
        for s in signers.iter() {
            if &s == signer {
                return;
            }
        }
        panic!("Not an authorized signer");
    }

    fn check_not_expired(env: &Env, proposal: &Proposal) {
        if env.ledger().timestamp() > proposal.expires_at {
            panic!("Proposal has expired");
        }
    }
}

// ─── Tests ────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Env, String};

    #[test]
    fn test_create_and_approve_proposal() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, MultiSig);
        let client = MultiSigClient::new(&env, &contract_id);

        let wallet = Address::generate(&env);
        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let destination = Address::generate(&env);

        let mut signers = Vec::new(&env);
        signers.push_back(signer1.clone());
        signers.push_back(signer2.clone());

        client.configure(&wallet, &signers, &2);

        let proposal_id = client.create_proposal(
            &wallet,
            &destination,
            &String::from_str(&env, "100"),
            &String::from_str(&env, "XLM"),
        );

        client.approve_proposal(&wallet, &proposal_id, &signer1);
        client.approve_proposal(&wallet, &proposal_id, &signer2);

        let proposals = client.list_proposals(&wallet);
        assert_eq!(proposals.get(0).unwrap().status, ProposalStatus::Approved);
    }
}
