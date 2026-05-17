import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";

export interface AuthRequest extends Request {
  walletAddress?: string;
}

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

export function authMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError(401, "Missing or invalid authorization header"));
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { walletAddress: string };
    req.walletAddress = payload.walletAddress;
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
}

export function generateToken(walletAddress: string): string {
  return jwt.sign(
    { walletAddress },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" }
  );
}
