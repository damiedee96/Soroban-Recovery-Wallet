import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { walletRouter } from "./routes/wallet";
import { guardianRouter } from "./routes/guardian";
import { recoveryRouter } from "./routes/recovery";
import { multisigRouter } from "./routes/multisig";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";

const app = express();

// ─── Security middleware ──────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);

// ─── Rate limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
});
app.use(limiter);

// ─── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────
app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.http(msg.trim()) },
  })
);

// ─── Health check ─────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    network: process.env.STELLAR_NETWORK ?? "testnet",
  });
});

// ─── API routes ───────────────────────────────────────────────
app.use("/api/wallet", walletRouter);
app.use("/api/guardian", guardianRouter);
app.use("/api/recovery", recoveryRouter);
app.use("/api/multisig", multisigRouter);

// ─── 404 handler ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ─── Error handler ────────────────────────────────────────────
app.use(errorHandler);

export default app;
