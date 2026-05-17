import { Router } from "express";
import { z } from "zod";
import { Keypair, Networks } from "@stellar/stellar-sdk";
import { generateToken } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

export const walletRouter = Router();

// ─── POST /api/wallet/auth ─────────────────────────────────────
// Verify a signed challenge and issue a JWT
walletRouter.post("/auth", async (req, res, next) => {
  try {
    const schema = z.object({
      publicKey: z.string().min(56).max(56),
      signature: z.string(),
      challenge: z.string(),
    });

    const { publicKey, signature, challenge } = schema.parse(req.body);

    // Verify the signature against the challenge
    const kp = Keypair.fromPublicKey(publicKey);
    const isValid = kp.verify(
      Buffer.from(challenge, "utf-8"),
      Buffer.from(signature, "hex")
    );

    if (!isValid) {
      throw new AppError(401, "Invalid signature");
    }

    const token = generateToken(publicKey);
    res.json({ success: true, data: { token, publicKey } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/wallet/challenge ─────────────────────────────────
// Get a random challenge string for signing
walletRouter.get("/challenge", (_req, res) => {
  const challenge = `soroban-recovery-wallet:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2)}`;
  res.json({ success: true, data: { challenge } });
});

// ─── GET /api/wallet/:address ──────────────────────────────────
walletRouter.get("/:address", async (req, res, next) => {
  try {
    const { address } = req.params;

    // Validate address format
    try {
      Keypair.fromPublicKey(address);
    } catch {
      throw new AppError(400, "Invalid Stellar address");
    }

    // In production this would query the contract; return mock for scaffold
    res.json({
      success: true,
      data: {
        address,
        publicKey: address,
        balance: "0",
        isFrozen: false,
        createdAt: Date.now(),
        owner: address,
      },
    });
  } catch (err) {
    next(err);
  }
});
