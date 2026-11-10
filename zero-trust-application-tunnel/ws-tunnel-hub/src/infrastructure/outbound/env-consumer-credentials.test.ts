import { describe, it, expect } from "vitest";
import { EnvConsumerCredentials } from "./env-consumer-credentials";

describe("EnvConsumerCredentials", () => {
  it("AK-4.1: consumer token ayrı doğrulanır", () => {
    const credentials = new EnvConsumerCredentials("consumer-secret");
    expect(credentials.verify("consumer-secret")).toBe(true);
    expect(credentials.verify("peer-secret")).toBe(false);
    expect(credentials.verify("")).toBe(false);
  });

  it("boş token ile kurulum reddedilir", () => {
    expect(() => new EnvConsumerCredentials(" ")).toThrow();
  });
});
