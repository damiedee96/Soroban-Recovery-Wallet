/**
 * generate-keypair.ts
 *
 * Generates a fresh Stellar keypair and optionally funds it on testnet.
 *
 * Usage:
 *   npx ts-node scripts/generate-keypair.ts [--fund]
 */

import { Keypair } from "@stellar/stellar-sdk";

async function main() {
  const shouldFund = process.argv.includes("--fund");

  const kp = Keypair.random();

  console.log("\n🔑 New Stellar Keypair");
  console.log("─".repeat(60));
  console.log(`Public Key  : ${kp.publicKey()}`);
  console.log(`Secret Key  : ${kp.secret()}`);
  console.log("─".repeat(60));
  console.log("⚠️  Store the secret key securely — it cannot be recovered.\n");

  if (shouldFund) {
    console.log("💧 Funding on testnet via Friendbot...");
    const res = await fetch(
      `https://friendbot.stellar.org?addr=${kp.publicKey()}`
    );
    if (res.ok) {
      console.log("✅ Account funded with 10,000 XLM on testnet");
    } else {
      console.error("❌ Friendbot funding failed:", res.statusText);
    }
  }
}

main().catch(console.error);
