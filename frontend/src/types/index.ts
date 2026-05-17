// ─── Wallet ───────────────────────────────────────────────────

export interface Wallet {
  address: string;
  publicKey: string;
  balance: string; // in XLM
  isFrozen: boolean;
  createdAt: number; // Unix timestamp (ledger)
  owner: string;
}

export interface Transaction {
  id: string;
  type: "send" | "receive" | "contract_call";
  amount: string;
  asset: string;
  from: string;
  to: string;
  memo?: string;
  timestamp: number;
  status: "pending" | "success" | "failed";
  ledger?: number;
}

// ─── Guardian ─────────────────────────────────────────────────

export interface Guardian {
  address: string;
  alias?: string;
  addedAt: number;
  isActive: boolean;
}

export interface GuardianConfig {
  guardians: Guardian[];
  threshold: number; // M-of-N required approvals
  totalGuardians: number;
}

// ─── Recovery ─────────────────────────────────────────────────

export type RecoveryStatus =
  | "none"
  | "pending"
  | "approved"
  | "executed"
  | "cancelled"
  | "expired";

export interface RecoveryRequest {
  id: string;
  walletAddress: string;
  newOwner: string;
  initiatedBy: string;
  initiatedAt: number;
  executeAfter: number; // Unix timestamp — earliest execution time
  expiresAt: number;
  status: RecoveryStatus;
  approvals: string[]; // guardian addresses that approved
  requiredApprovals: number;
}

// ─── Multi-Sig ────────────────────────────────────────────────

export type ProposalStatus = "open" | "approved" | "executed" | "rejected" | "expired";

export interface MultiSigProposal {
  id: string;
  walletAddress: string;
  proposedBy: string;
  proposedAt: number;
  expiresAt: number;
  status: ProposalStatus;
  approvals: string[];
  rejections: string[];
  requiredApprovals: number;
  transaction: {
    destination: string;
    amount: string;
    asset: string;
    memo?: string;
  };
}

// ─── Security ─────────────────────────────────────────────────

export interface FreezeStatus {
  isFrozen: boolean;
  frozenAt?: number;
  frozenBy?: string;
  reason?: string;
}

// ─── API Responses ────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Store ────────────────────────────────────────────────────

export interface WalletState {
  wallet: Wallet | null;
  transactions: Transaction[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface RecoveryState {
  activeRequest: RecoveryRequest | null;
  history: RecoveryRequest[];
  guardianConfig: GuardianConfig | null;
  isLoading: boolean;
  error: string | null;
}

// ─── Soroban Contract ─────────────────────────────────────────

export interface ContractCallParams {
  contractId: string;
  method: string;
  args: unknown[];
  signerSecretKey?: string;
}

export interface ContractCallResult {
  success: boolean;
  result?: unknown;
  txHash?: string;
  error?: string;
}
