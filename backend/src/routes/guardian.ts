import { Router } from "express";
import { z } from "zod";
import { Keypair } from "@stellar/stellar-sdk";
import { AppError } from "../middleware/errorHandler";
import {
  CONTRACT_IDS,
  simulateCall,
  invokeContract,
  toAddress,
  toU64,
} from "../services/sorobanService";

export const guardianRouter = Router();

// ─── GET /api/guardian/:walletAddress ─────────────────────────
guardianRouter.get("/:walletAddress", async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const { caller } = req.query;

    if (!caller || typeof caller !== "string") {
      throw new AppError(400, "caller query param required");
    }

    // Query guardian registry contract
    let data: unknown;
    try {
      data = await simulateCall(
        CONTRACT_IDS.guardianRegistry,
        "list_guardians",
        [toAddress(walletAddress)],
        caller
      );
    } catch {
      // Contract not deployed yet — return empty config
      data = { guardians: [], threshold: 2, totalGuardians: 0 };
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/guardian/:walletAddress/add ─────────────────────
guardianRouter.post("/:walletAddress/add", async (req, res, next) => {
  try {
    const schema = z.object({
      guardianAddress: z.string().min(56).max(56),
      signerSecretKey: z.string().min(56),
    });

    const { walletAddress } = req.params;
    const { guardianAddress, signerSecretKey } = schema.parse(req.body);

    const result = await invokeContract(
      CONTRACT_IDS.guardianRegistry,
      "add_guardian",
      [toAddress(walletAddress), toAddress(guardianAddress)],
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

// ─── POST /api/guardian/:walletAddress/remove ─────────────────
guardianRouter.post("/:walletAddress/remove", async (req, res, next) => {
  try {
    const schema = z.object({
      guardianAddress: z.string().min(56).max(56),
      signerSecretKey: z.string().min(56),
    });

    const { walletAddress } = req.params;
    const { guardianAddress, signerSecretKey } = schema.parse(req.body);

    const result = await invokeContract(
      CONTRACT_IDS.guardianRegistry,
      "remove_guardian",
      [toAddress(walletAddress), toAddress(guardianAddress)],
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

// ─── POST /api/guardian/:walletAddress/threshold ──────────────
guardianRouter.post("/:walletAddress/threshold", async (req, res, next) => {
  try {
    const schema = z.object({
      threshold: z.number().int().min(1),
      signerSecretKey: z.string().min(56),
    });

    const { walletAddress } = req.params;
    const { threshold, signerSecretKey } = schema.parse(req.body);

    const result = await invokeContract(
      CONTRACT_IDS.guardianRegistry,
      "set_threshold",
      [toAddress(walletAddress), toU64(threshold)],
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
