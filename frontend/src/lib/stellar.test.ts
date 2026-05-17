import {
  isValidPublicKey,
  shortenAddress,
  stroopsToXlm,
  xlmToStroops,
  generateKeypair,
} from "./stellar";

describe("isValidPublicKey", () => {
  it("returns true for a valid Stellar public key", () => {
    expect(
      isValidPublicKey("GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN")
    ).toBe(true);
  });

  it("returns false for an invalid key", () => {
    expect(isValidPublicKey("not-a-key")).toBe(false);
    expect(isValidPublicKey("")).toBe(false);
    expect(isValidPublicKey("GAAA")).toBe(false);
  });
});

describe("shortenAddress", () => {
  it("shortens a long address", () => {
    const addr = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
    const short = shortenAddress(addr, 4);
    expect(short).toBe("GAAZ...CCWN");
  });

  it("returns the address unchanged if too short", () => {
    expect(shortenAddress("GABC", 4)).toBe("GABC");
  });
});

describe("stroopsToXlm", () => {
  it("converts 10000000 stroops to 1 XLM", () => {
    expect(stroopsToXlm(10_000_000)).toBe("1.0000000");
  });

  it("converts 0 stroops to 0 XLM", () => {
    expect(stroopsToXlm(0)).toBe("0.0000000");
  });
});

describe("xlmToStroops", () => {
  it("converts 1 XLM to 10000000 stroops", () => {
    expect(xlmToStroops(1)).toBe("10000000");
  });

  it("converts 0.5 XLM to 5000000 stroops", () => {
    expect(xlmToStroops(0.5)).toBe("5000000");
  });
});

describe("generateKeypair", () => {
  it("generates a keypair with publicKey and secretKey", () => {
    const kp = generateKeypair();
    expect(kp.publicKey).toMatch(/^G/);
    expect(kp.secretKey).toMatch(/^S/);
  });

  it("generates unique keypairs each time", () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    expect(kp1.publicKey).not.toBe(kp2.publicKey);
  });
});
