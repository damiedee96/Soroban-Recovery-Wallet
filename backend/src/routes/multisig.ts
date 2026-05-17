import { Router } from "express";
import { z } from "zod";
import { nativeToScVal } from "@stellar/stellar-sdk";
import { AppError } from "../middleware/errorHandler";
import {
  CONTRACT_IDS,
  simulateCall,
  invokeContract,
  toAddress,
} from "../services/sorobanService";

export const multisigRouter = Router();

// ─── GET /api/multisig/:walletAddress/proposals ───────────────
multisigRouter.get("/:walletAddress/proposals", async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const { caller } = req.query;

    if (!caller || typeof caller !== "string") {
      throw new AppError(400, "caller query param required");
    }

    let data: unknown = [];
    try {
      data = await simulateCall(
        CONTRACT_IDS.multisig,
        "list_proposals",
        [toAddress(walletAddress)],
        caller
      );
    } catch {
      // Contract not deployed — return empty
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/multisig/:walletAddress/propose ────────────────
multisigRouter.post("/:walletAddress/propose", async (req, res, next) => {
  try {
    const schema = z.object({
      destination: z.string().min(56).max(56),
      amount: z.string(),
      asset: z.string().default("XLM"),
      memo: z.string().optional(),
      signerSecretKey: z.string().min(56),
    });

    const { walletAddress } = req.params;
    const { destination, amount, asset, signerSecretKey } = schema.parse(req.body);

    const result = await invokeContract(
      CONTRACT_IDS.multisig,
      "create_proposal",
      [
        toAddress(walletAddress),
        toAddress(destination),
        nativeToScVal(amount, { type: "string" }),
        nativeToScVal(asset, { type: "string" }),
      ],
      signerSecretKey
    );

    if (!result.success) {
      throw new AppError(400, result.error ?? "Contract call failed");
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/multisig/:walletAddress/approve ────────────────
multisigRouter.post("/:walletAddress/approve", async (req, res, next) => {
  try {
    const schema = z.object({
      proposalId: z.string(),
      signerSecretKey: z.string().min(56),
    });

    const { walletAddress } = req.params;
    const { proposalId, signerSecretKey } = schema.parse(req.body);

    const result = await invokeContract(
      CONTRACT_IDS.multisig,
      "approve_proposal",
      [toAddress(walletAddress), nativeToScVal(proposalId, { type: "string" })],
      signerSecretKey
    );

    if (!result.success) {
      throw new AppError(400, result.error ?? "Contract call failed");
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/multisig/:walletAddress/execute ────────────────
multisigRouter.post("/:walletAddress/execute", async (req, res, next) => {
  try {
    const schema = z.object({
      proposalId: z.string(),
      signerSecretKey: z.string().min(56),
    });

    const { walletAddress } = req.params;
    const { proposalId, signerSecretKey } = schema.parse(req.body);

    const result = await invokeContract(
      CONTRACT_IDS.multisig,
      "execute_proposal",
      [toAddress(walletAddress), nativeToScVal(proposalId, { type: "string" })],
      signerSecretKey
    );

    if (!result.success) {
      throw new AppError(400, result.error ?? "Contract call failed");
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});
