import { AppError } from "../middleware/errorHandler";
import { generateToken } from "../middleware/auth";
import jwt from "jsonwebtoken";

describe("AppError", () => {
  it("creates an error with statusCode and message", () => {
    const err = new AppError(404, "Not found");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.name).toBe("AppError");
  });

  it("is an instance of Error", () => {
    const err = new AppError(500, "Server error");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("generateToken", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, JWT_SECRET: "test-secret-32-chars-long-enough" };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("generates a valid JWT containing the wallet address", () => {
    const address = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const token = generateToken(address);
    expect(typeof token).toBe("string");

    const decoded = jwt.decode(token) as { walletAddress: string };
    expect(decoded.walletAddress).toBe(address);
  });

  it("generates different tokens for different addresses", () => {
    const t1 = generateToken("GAAA");
    const t2 = generateToken("GBBB");
    expect(t1).not.toBe(t2);
  });
});
