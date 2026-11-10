import { describe, it, expect } from "vitest";
import { parseArgs } from "./args";

describe("parseArgs", () => {
  it("varsayılan komut run + seçenekler", () => {
    expect(parseArgs([]).command).toBe("run");
    expect(parseArgs(["--config", "/etc/a.env"]).configPath).toBe("/etc/a.env");
    expect(parseArgs(["setup", "--setup-port", "9090"]).setupPort).toBe(9090);
  });

  it("alt komutlar ve config show", () => {
    expect(parseArgs(["wizard", "--name", "a"]).command).toBe("wizard");
    expect(parseArgs(["uninstall", "--name", "a"]).command).toBe("uninstall");
    expect(parseArgs(["config", "show"]).command).toBe("config-show");
    expect(parseArgs(["--help"]).command).toBe("help");
    expect(parseArgs(["-h"]).command).toBe("help");
  });

  it("geçersiz girdi hata fırlatır", () => {
    expect(() => parseArgs(["bozuk"])).toThrow(/Bilinmeyen komut/);
    expect(() => parseArgs(["setup", "--setup-port", "0"])).toThrow(/setup-port/);
    expect(() => parseArgs(["--config"])).toThrow(/deger gerekli/);
    expect(() => parseArgs(["config"])).toThrow(/config show/);
  });
});
