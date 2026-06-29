import React from "react";
import { COLORS, type ColorToken } from "./tokens";

const meta = { title: "Design Tokens/Colors" };
export default meta;

type Group = { name: string; tokens: ColorToken[] };

const groups = ((): Group[] => {
  const all = Object.keys(COLORS) as ColorToken[];
  const map: Record<string, ColorToken[]> = {};

  for (const token of all) {
    let key: string;
    if (token === "cable" || token === "terminal" || token === "shadow" || token.startsWith("dc")) {
      key = "Special";
    } else if (token.includes("Alpha")) {
      key = "Alpha";
    } else if (/^success|^warning|^error|^info|^idle/.test(token)) {
      key = "Status";
    } else if (token.startsWith("bg")) {
      key = "Surface";
    } else if (token.startsWith("border")) {
      key = "Border";
    } else if (token.startsWith("text")) {
      key = "Text";
    } else if (token.startsWith("grad")) {
      key = "Gradient";
    } else if (token.startsWith("temp")) {
      key = "Temperature";
    } else if (token.startsWith("chart")) {
      key = "Chart";
    } else if (token.startsWith("accent")) {
      key = "Accent";
    } else {
      key = "Other";
    }
    if (!map[key]) map[key] = [];
    map[key].push(token);
  }

  const order = ["Status", "Surface", "Border", "Text", "Gradient", "Temperature", "Special", "Alpha", "Chart", "Accent"];
  return order.filter((k) => map[k]).map((name) => ({ name, tokens: map[name] }));
})();

const swatch = { width: 60, height: 40, borderRadius: 4 };

export const AllColors = () => (
  <div style={{ padding: 24, background: "#111", color: "#e5e7eb", fontFamily: "monospace" }}>
    <h1 style={{ fontSize: 24, marginBottom: 24 }}>Color Tokens ({Object.keys(COLORS).length})</h1>
    {groups.map((g) => (
      <section key={g.name} style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, color: "#9ca3af", marginBottom: 12, borderBottom: "1px solid #2a2a3a", paddingBottom: 4 }}>
          {g.name} ({g.tokens.length})
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {g.tokens.map((token) => (
            <div key={token} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ ...swatch, background: COLORS[token], border: "1px solid #2a2a3a" }} />
              <span style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>{token}</span>
              <span style={{ fontSize: 9, color: "#6b7280" }}>{COLORS[token]}</span>
            </div>
          ))}
        </div>
      </section>
    ))}
  </div>
);
