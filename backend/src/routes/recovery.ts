import { Router } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler";
import {
  CONTRACT_IDS,
  simulateCall,
  invokeContract,
  toAddress,
  toSymbol,
} from "../services/sorobanService";

export const recoveryRouter = Router();

// ─── GET /api/recovery/:walletAddress/active ──────────────────
recoveryRouter.get("/:walletAddress/active", async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const { caller } = req.query;

    if (!caller || typeof caller !== "string") {
      throw new AppError(400, "caller query param required");
    }

    let data: unknown = null;
    try {
      data = await simulateCall(
        CONTRACT_IDS.recoveryWallet,
        "get_active_recovery",
        [toAddress(walletAddress)],
        caller
      );
    } catch {
      // Contract not deployed — return null
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/recovery/:walletAddress/history ─────────────────
recoveryRouter.get("/:walletAddress/history", async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    const { caller } = req.query;

    if (!caller || typeof caller !== "string") {
      throw new AppError(400, "caller query param required");
    }

    let data: unknown = [];
    try {
      data = await simulateCall(
        CONTRACT_IDS.recoveryWallet,
        "get_recovery_history",
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

// ─── POST /api/recovery/:walletAddress/initiate ───────────────
recoveryRouter.post("/:walletAddress/initiate", async (req, res, next) => {
  try {
    const schema = z.object({
      newOwner: z.string().min(56).max(56),
      signerSecretKey: z.string().min(56),
    });

    const { walletAddress } = req.params;
    const { newOwner, signerSecretKey } = schema.parse(req.body);

    const result = await invokeContract(
      CONTRACT_IDS.recoveryWallet,
      "initiate_recovery",
      [toAddress(walletAddress), toAddress(newOwner)],
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

// ─── POST /api/recovery/:walletAddress/approve ────────────────
recoveryRouter.post("/:walletAddress/approve", async (req, res, next) => {
  try {
    const schema = z.object({
      requestId: z.string(),
      guardianSecretKey: z.string().min(56),
    });

    const { walletAddress } = req.params;
    const { requestId, guardianSecretKey } = schema.parse(req.body);

    const result = await invokeContract(
      CONTRACT_IDS.recoveryWallet,
      "approve_recovery",
      [toAddress(walletAddress), toSymbol(requestId)],
      guardianSecretKey
    );

    if (!result.success) {
      throw new AppError(400, result.error ?? "Contract call failed");
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/recovery/:walletAddress/cancel ─────────────────
recoveryRouter.post("/:walletAddress/cancel", async (req, res, next) => {
  try {
    const schema = z.object({
      signerSecretKey: z.string().min(56),
    });

    const { walletAddress } = req.params;
    const { signerSecretKey } = schema.parse(req.body);

    const result = await invokeContract(
      CONTRACT_IDS.recoveryWallet,
      "cancel_recovery",
      [toAddress(walletAddress)],
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

// ─── POST /api/recovery/:walletAddress/execute ────────────────
recoveryRouter.post("/:walletAddress/execute", async (req, res, next) => {
  try {
    const schema = z.object({
      signerSecretKey: z.string().min(56),
    });

    const { walletAddress } = req.params;
    const { signerSecretKey } = schema.parse(req.body);

    const result = await invokeContract(
      CONTRACT_IDS.recoveryWallet,
      "execute_recovery",
      [toAddress(walletAddress)],
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
