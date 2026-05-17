import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  nativeToScVal,
  scValToNative,
  Address,
} from "@stellar/stellar-sdk";
import type { ContractCallParams, ContractCallResult } from "@/types";

// ─── RPC Client ───────────────────────────────────────────────

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
  "https://soroban-testnet.stellar.org";

const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET";

export const networkPassphrase =
  NETWORK === "MAINNET"
    ? Networks.PUBLIC
    : NETWORK === "LOCAL"
    ? Networks.STANDALONE
    : Networks.TESTNET;

export const sorobanRpc = new SorobanRpc.Server(SOROBAN_RPC_URL, {
  allowHttp: SOROBAN_RPC_URL.startsWith("http://"),
});

// ─── Contract IDs ─────────────────────────────────────────────

export const CONTRACT_IDS = {
  recoveryWallet:
    process.env.NEXT_PUBLIC_RECOVERY_WALLET_CONTRACT_ID ?? "",
  guardianRegistry:
    process.env.NEXT_PUBLIC_GUARDIAN_REGISTRY_CONTRACT_ID ?? "",
  multisig: process.env.NEXT_PUBLIC_MULTISIG_CONTRACT_ID ?? "",
} as const;

// ─── ScVal Helpers ────────────────────────────────────────────

/** Convert a Stellar address string to ScVal */
export function addressToScVal(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

/** Convert a number to ScVal u64 */
export function u64ToScVal(value: number | bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

/** Convert a string to ScVal symbol */
export function symbolToScVal(value: string): xdr.ScVal {
  return xdr.ScVal.scvSymbol(value);
}

/** Convert a boolean to ScVal */
export function boolToScVal(value: boolean): xdr.ScVal {
  return xdr.ScVal.scvBool(value);
}

/** Decode a ScVal to a native JS value */
export function decodeScVal(val: xdr.ScVal): unknown {
  return scValToNative(val);
}

// ─── Simulation ───────────────────────────────────────────────

/**
 * Simulate a contract call (read-only, no fee).
 * Returns the decoded result value.
 */
export async function simulateContractCall(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  callerPublicKey: string
): Promise<unknown> {
  const contract = new Contract(contractId);
  const account = await sorobanRpc.getAccount(callerPublicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simResult = await sorobanRpc.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error}`);
  }

  if (!SorobanRpc.Api.isSimulationSuccess(simResult)) {
    throw new Error("Simulation returned unexpected result");
  }

  const returnVal = simResult.result?.retval;
  return returnVal ? decodeScVal(returnVal) : null;
}

// ─── Contract Invocation ──────────────────────────────────────

/**
 * Invoke a Soroban contract method (state-changing).
 * Requires a signer secret key.
 */
export async function invokeContract(
  params: ContractCallParams
): Promise<ContractCallResult> {
  const { contractId, method, args, signerSecretKey } = params;

  if (!signerSecretKey) {
    return { success: false, error: "Signer secret key is required" };
  }

  try {
    const { Keypair } = await import("@stellar/stellar-sdk");
    const signer = Keypair.fromSecret(signerSecretKey);
    const contract = new Contract(contractId);
    const account = await sorobanRpc.getAccount(signer.publicKey());

    const scArgs = args as xdr.ScVal[];

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call(method, ...scArgs))
      .setTimeout(30)
      .build();

    // Simulate to get footprint + resource fees
    const simResult = await sorobanRpc.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simResult)) {
      return { success: false, error: simResult.error };
    }

    // Assemble the transaction with simulation data
    const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();
    preparedTx.sign(signer);

    // Submit
    const sendResult = await sorobanRpc.sendTransaction(preparedTx);
    if (sendResult.status === "ERROR") {
      return { success: false, error: sendResult.errorResult?.toString() };
    }

    // Poll for confirmation
    const txHash = sendResult.hash;
    let getResult = await sorobanRpc.getTransaction(txHash);
    let attempts = 0;

    while (
      getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
      attempts < 20
    ) {
      await new Promise((r) => setTimeout(r, 1500));
      getResult = await sorobanRpc.getTransaction(txHash);
      attempts++;
    }

    if (getResult.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      const returnVal = getResult.returnValue
        ? decodeScVal(getResult.returnValue)
        : null;
      return { success: true, result: returnVal, txHash };
    }

    return {
      success: false,
      error: `Transaction failed with status: ${getResult.status}`,
      txHash,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Recovery Wallet Contract Helpers ─────────────────────────

export const recoveryWalletContract = {
  /** Get wallet info */
  getWallet: (walletAddress: string, caller: string) =>
    simulateContractCall(
      CONTRACT_IDS.recoveryWallet,
      "get_wallet",
      [addressToScVal(walletAddress)],
      caller
    ),

  /** Initiate a recovery request */
  initiateRecovery: (
    walletAddress: string,
    newOwner: string,
    signerSecretKey: string
  ) =>
    invokeContract({
      contractId: CONTRACT_IDS.recoveryWallet,
      method: "initiate_recovery",
      args: [addressToScVal(walletAddress), addressToScVal(newOwner)],
      signerSecretKey,
    }),

  /** Approve a pending recovery request */
  approveRecovery: (
    walletAddress: string,
    requestId: string,
    signerSecretKey: string
  ) =>
    invokeContract({
      contractId: CONTRACT_IDS.recoveryWallet,
      method: "approve_recovery",
      args: [addressToScVal(walletAddress), symbolToScVal(requestId)],
      signerSecretKey,
    }),

  /** Cancel a recovery request (owner only) */
  cancelRecovery: (walletAddress: string, signerSecretKey: string) =>
    invokeContract({
      contractId: CONTRACT_IDS.recoveryWallet,
      method: "cancel_recovery",
      args: [addressToScVal(walletAddress)],
      signerSecretKey,
    }),

  /** Execute recovery after time delay + threshold met */
  executeRecovery: (walletAddress: string, signerSecretKey: string) =>
    invokeContract({
      contractId: CONTRACT_IDS.recoveryWallet,
      method: "execute_recovery",
      args: [addressToScVal(walletAddress)],
      signerSecretKey,
    }),

  /** Freeze the wallet */
  freeze: (walletAddress: string, signerSecretKey: string) =>
    invokeContract({
      contractId: CONTRACT_IDS.recoveryWallet,
      method: "freeze",
      args: [addressToScVal(walletAddress)],
      signerSecretKey,
    }),

  /** Unfreeze the wallet */
  unfreeze: (walletAddress: string, signerSecretKey: string) =>
    invokeContract({
      contractId: CONTRACT_IDS.recoveryWallet,
      method: "unfreeze",
      args: [addressToScVal(walletAddress)],
      signerSecretKey,
    }),
};

// ─── Guardian Registry Contract Helpers ───────────────────────

export const guardianRegistryContract = {
  /** List all guardians for a wallet */
  listGuardians: (walletAddress: string, caller: string) =>
    simulateContractCall(
      CONTRACT_IDS.guardianRegistry,
      "list_guardians",
      [addressToScVal(walletAddress)],
      caller
    ),

  /** Add a guardian */
  addGuardian: (
    walletAddress: string,
    guardianAddress: string,
    signerSecretKey: string
  ) =>
    invokeContract({
      contractId: CONTRACT_IDS.guardianRegistry,
      method: "add_guardian",
      args: [addressToScVal(walletAddress), addressToScVal(guardianAddress)],
      signerSecretKey,
    }),

  /** Remove a guardian */
  removeGuardian: (
    walletAddress: string,
    guardianAddress: string,
    signerSecretKey: string
  ) =>
    invokeContract({
      contractId: CONTRACT_IDS.guardianRegistry,
      method: "remove_guardian",
      args: [addressToScVal(walletAddress), addressToScVal(guardianAddress)],
      signerSecretKey,
    }),

  /** Update the approval threshold */
  setThreshold: (
    walletAddress: string,
    threshold: number,
    signerSecretKey: string
  ) =>
    invokeContract({
      contractId: CONTRACT_IDS.guardianRegistry,
      method: "set_threshold",
      args: [addressToScVal(walletAddress), u64ToScVal(threshold)],
      signerSecretKey,
    }),
};
