// ws-tunnel — jenerik, çoklanmış WebSocket tüneli (ayrı ürün paketi).
// GD-PMS'ye özgü KOD İÇERMEZ; domain adapter'leri monorepo'da yaşar
// (bkz. docs/architecture/KUTUPHANE-CIKARMA-PLANI.md).

export * from "./types";
export * from "./codec";
export * from "./protocol";
// NOT: errors 2026-09-01'de YAPRAK PAKETE taşındı: @gd-monorepo/result
export * from "./logger";
export * from "./channel";
export * from "./token";
export * from "./audit";
export * from "./snapshot";
export * from "./connector";
export * from "./client";
export * from "./session";
export * from "./proxy";