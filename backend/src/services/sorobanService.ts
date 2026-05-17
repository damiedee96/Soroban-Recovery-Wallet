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
  Keypair,
} from "@stellar/stellar-sdk";
import { logger } from "../utils/logger";

// ─── Network config ───────────────────────────────────────────

const SOROBAN_RPC_URL =
  process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

const NETWORK = process.env.STELLAR_NETWORK ?? "testnet";

export const networkPassphrase =
  NETWORK === "mainnet"
    ? Networks.PUBLIC
    : NETWORK === "local"
    ? Networks.STANDALONE
    : Networks.TESTNET;

export const sorobanRpc = new SorobanRpc.Server(SOROBAN_RPC_URL, {
  allowHttp: SOROBAN_RPC_URL.startsWith("http://"),
});

// ─── Contract IDs ─────────────────────────────────────────────

export const CONTRACT_IDS = {
  recoveryWallet: process.env.RECOVERY_WALLET_CONTRACT_ID ?? "",
  guardianRegistry: process.env.GUARDIAN_REGISTRY_CONTRACT_ID ?? "",
  multisig: process.env.MULTISIG_CONTRACT_ID ?? "",
} as const;

// ─── ScVal helpers ────────────────────────────────────────────

export const toAddress = (addr: string): xdr.ScVal =>
  new Address(addr).toScVal();

export const toU64 = (n: number | bigint): xdr.ScVal =>
  nativeToScVal(n, { type: "u64" });

export const toSymbol = (s: string): xdr.ScVal =>
  xdr.ScVal.scvSymbol(s);

export const decode = (val: xdr.ScVal): unknown => scValToNative(val);

// ─── Simulate (read-only) ─────────────────────────────────────

export async function simulateCall(
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

  const sim = await sorobanRpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`);
  }
  if (!SorobanRpc.Api.isSimulationSuccess(sim)) {
    throw new Error("Unexpected simulation result");
  }
  return sim.result?.retval ? decode(sim.result.retval) : null;
}

// ─── Invoke (state-changing) ──────────────────────────────────

export interface InvokeResult {
  success: boolean;
  txHash?: string;
  result?: unknown;
  error?: string;
}

export async function invokeContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  signerSecret: string
): Promise<InvokeResult> {
  try {
    const signer = Keypair.fromSecret(signerSecret);
    const contract = new Contract(contractId);
    const account = await sorobanRpc.getAccount(signer.publicKey());

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await sorobanRpc.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      return { success: false, error: sim.error };
    }

    const prepared = SorobanRpc.assembleTransaction(tx, sim).build();
    prepared.sign(signer);

    const send = await sorobanRpc.sendTransaction(prepared);
    if (send.status === "ERROR") {
      return { success: false, error: send.errorResult?.toString() };
    }

    const txHash = send.hash;
    let poll = await sorobanRpc.getTransaction(txHash);
    let attempts = 0;

    while (
      poll.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
      attempts < 20
    ) {
      await new Promise((r) => setTimeout(r, 1500));
      poll = await sorobanRpc.getTransaction(txHash);
      attempts++;
    }

    if (poll.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return {
        success: true,
        txHash,
        result: poll.returnValue ? decode(poll.returnValue) : null,
      };
    }

    return {
      success: false,
      error: `Transaction ${poll.status}`,
      txHash,
    };
  } catch (err) {
    logger.error("invokeContract error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
