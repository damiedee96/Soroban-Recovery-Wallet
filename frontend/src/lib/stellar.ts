import {
  Keypair,
  Networks,
  Server,
  TransactionBuilder,
  BASE_FEE,
  Operation,
  Asset,
  Memo,
} from "@stellar/stellar-sdk";

// ─── Network Configuration ────────────────────────────────────

const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET";
const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

export const networkPassphrase =
  NETWORK === "MAINNET"
    ? Networks.PUBLIC
    : NETWORK === "LOCAL"
    ? Networks.STANDALONE
    : Networks.TESTNET;

/** Horizon server instance */
export const horizonServer = new Server(HORIZON_URL);

// ─── Keypair Utilities ────────────────────────────────────────

/** Generate a fresh random Stellar keypair */
export function generateKeypair(): { publicKey: string; secretKey: string } {
  const kp = Keypair.random();
  return { publicKey: kp.publicKey(), secretKey: kp.secret() };
}

/** Derive keypair from a secret key string */
export function keypairFromSecret(secret: string): Keypair {
  return Keypair.fromSecret(secret);
}

/** Derive keypair from a public key string */
export function keypairFromPublic(publicKey: string): Keypair {
  return Keypair.fromPublicKey(publicKey);
}

/** Validate a Stellar public key */
export function isValidPublicKey(key: string): boolean {
  try {
    Keypair.fromPublicKey(key);
    return true;
  } catch {
    return false;
  }
}

// ─── Account Utilities ────────────────────────────────────────

/** Load account details from Horizon */
export async function loadAccount(publicKey: string) {
  return horizonServer.loadAccount(publicKey);
}

/** Get XLM balance for an account */
export async function getXlmBalance(publicKey: string): Promise<string> {
  const account = await horizonServer.loadAccount(publicKey);
  const xlmBalance = account.balances.find(
    (b) => b.asset_type === "native"
  );
  return xlmBalance?.balance ?? "0";
}

/** Fund an account on testnet via Friendbot */
export async function fundTestnetAccount(publicKey: string): Promise<void> {
  const response = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
  );
  if (!response.ok) {
    throw new Error(`Friendbot funding failed: ${response.statusText}`);
  }
}

// ─── Transaction Utilities ────────────────────────────────────

/** Build a simple XLM payment transaction */
export async function buildPaymentTransaction(params: {
  sourcePublicKey: string;
  destination: string;
  amount: string;
  memo?: string;
}) {
  const { sourcePublicKey, destination, amount, memo } = params;
  const sourceAccount = await loadAccount(sourcePublicKey);

  const builder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount,
      })
    )
    .setTimeout(30);

  if (memo) {
    builder.addMemo(Memo.text(memo));
  }

  return builder.build();
}

/** Submit a signed transaction to Horizon */
export async function submitTransaction(signedXdr: string) {
  const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  return horizonServer.submitTransaction(tx);
}

// ─── Transaction History ──────────────────────────────────────

/** Fetch recent transactions for an account */
export async function getTransactionHistory(
  publicKey: string,
  limit = 20
) {
  const records = await horizonServer
    .transactions()
    .forAccount(publicKey)
    .limit(limit)
    .order("desc")
    .call();

  return records.records;
}

// ─── Formatting ───────────────────────────────────────────────

/** Shorten a Stellar address for display: GABCD...WXYZ */
export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Convert stroops to XLM */
export function stroopsToXlm(stroops: string | number): string {
  return (Number(stroops) / 10_000_000).toFixed(7);
}

/** Convert XLM to stroops */
export function xlmToStroops(xlm: string | number): string {
  return Math.round(Number(xlm) * 10_000_000).toString();
}
