import { sendNotification } from "../services/notificationService";

describe("sendNotification", () => {
  it("resolves without throwing when EMAIL_PROVIDER is none", async () => {
    process.env.EMAIL_PROVIDER = "none";
    await expect(
      sendNotification({
        event: "recovery_initiated",
        walletAddress: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
        data: { newOwner: "GBBB", executeAfter: "2026-01-01" },
      })
    ).resolves.not.toThrow();
  });

  it("resolves for wallet_frozen event", async () => {
    await expect(
      sendNotification({
        event: "wallet_frozen",
        walletAddress: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
        data: { frozenAt: new Date().toISOString() },
      })
    ).resolves.not.toThrow();
  });

  it("resolves for guardian_added event", async () => {
    await expect(
      sendNotification({
        event: "guardian_added",
        walletAddress: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
        data: { guardian: "GCCC" },
      })
    ).resolves.not.toThrow();
  });
});
