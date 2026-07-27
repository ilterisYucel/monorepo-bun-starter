import { describe, it, expect } from "vitest";
import { hexToNumber, COLORS } from "../colors";

describe("hexToNumber", () => {
  it("converts hex string to number", () => {
    expect(hexToNumber("#10b981")).toBe(0x10b981);
  });

  it("handles alpha hex colors", () => {
    expect(hexToNumber("#ff0000")).toBe(0xff0000);
  });

  it("handles white", () => {
    expect(hexToNumber("#ffffff")).toBe(0xffffff);
  });

  it("handles black", () => {
    expect(hexToNumber("#000000")).toBe(0x000000);
  });
});

describe("COLORS tokens", () => {
  it("all status tokens are valid hex", () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    expect(COLORS.success).toMatch(hexRegex);
    expect(COLORS.warning).toMatch(hexRegex);
    expect(COLORS.error).toMatch(hexRegex);
    expect(COLORS.info).toMatch(hexRegex);
  });

  it("all background tokens are valid hex", () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    expect(COLORS.bgApp).toMatch(hexRegex);
    expect(COLORS.bgCard).toMatch(hexRegex);
    expect(COLORS.bgHeader).toMatch(hexRegex);
  });

  it("all text tokens are valid hex", () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    expect(COLORS.textPrimary).toMatch(hexRegex);
    expect(COLORS.textWhite).toMatch(hexRegex);
    expect(COLORS.textMuted).toMatch(hexRegex);
  });

  it("no two tokens share the same value for common groups", () => {
    expect(COLORS.success).not.toBe(COLORS.error);
    expect(COLORS.warning).not.toBe(COLORS.info);
    expect(COLORS.bgApp).not.toBe(COLORS.bgCard);
  });
});
