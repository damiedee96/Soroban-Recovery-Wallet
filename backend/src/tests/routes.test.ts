import request from "supertest";
import app from "../app";

// ─── Health check ─────────────────────────────────────────────

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });
});

// ─── 404 handler ──────────────────────────────────────────────

describe("Unknown routes", () => {
  it("returns 404 for unknown paths", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─── Wallet challenge ─────────────────────────────────────────

describe("GET /api/wallet/challenge", () => {
  it("returns a challenge string", async () => {
    const res = await request(app).get("/api/wallet/challenge");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.challenge).toBe("string");
    expect(res.body.data.challenge).toMatch(/^soroban-recovery-wallet:/);
  });
});

// ─── Wallet address validation ────────────────────────────────

describe("GET /api/wallet/:address", () => {
  it("returns 400 for an invalid address", async () => {
    const res = await request(app).get("/api/wallet/not-a-valid-key");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns wallet data for a valid public key", async () => {
    const validKey = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
    const res = await request(app).get(`/api/wallet/${validKey}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.address).toBe(validKey);
  });
});

// ─── Guardian validation ──────────────────────────────────────

describe("POST /api/guardian/:wallet/add", () => {
  it("returns 400 when body is missing", async () => {
    const wallet = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
    const res = await request(app)
      .post(`/api/guardian/${wallet}/add`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid guardian address", async () => {
    const wallet = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
    const res = await request(app)
      .post(`/api/guardian/${wallet}/add`)
      .send({ guardianAddress: "bad-address", signerSecretKey: "S".repeat(56) });
    expect(res.status).toBe(400);
  });
});

// ─── Recovery validation ──────────────────────────────────────

describe("POST /api/recovery/:wallet/initiate", () => {
  it("returns 400 when newOwner is missing", async () => {
    const wallet = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
    const res = await request(app)
      .post(`/api/recovery/${wallet}/initiate`)
      .send({ signerSecretKey: "S".repeat(56) });
    expect(res.status).toBe(400);
  });
});

// ─── Multi-sig validation ─────────────────────────────────────

describe("POST /api/multisig/:wallet/propose", () => {
  it("returns 400 when destination is missing", async () => {
    const wallet = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
    const res = await request(app)
      .post(`/api/multisig/${wallet}/propose`)
      .send({ amount: "100", signerSecretKey: "S".repeat(56) });
    expect(res.status).toBe(400);
  });
});
