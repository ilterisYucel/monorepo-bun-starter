import React, { useState } from "react";
import { SCADA_ICONS } from "./nav-icons";
import type { ScadaIconName } from "./types";

const meta = { title: "Design Tokens/Icons" };
export default meta;

const iconNames = Object.keys(SCADA_ICONS) as ScadaIconName[];

export const AllIcons = () => {
  const [search, setSearch] = useState("");

  const filtered = search
    ? iconNames.filter((name) => name.toLowerCase().includes(search.toLowerCase()))
    : iconNames;

  return (
    <div style={{ padding: 24, background: "#111", color: "#e5e7eb", fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Icons ({iconNames.length})</h1>
      <input
        type="text"
        placeholder="Search icons..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "8px 12px",
          fontSize: 14,
          borderRadius: 6,
          border: "1px solid #2a2a3a",
          background: "#1a1a2e",
          color: "#e5e7eb",
          outline: "none",
          width: 280,
          marginBottom: 24,
        }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {filtered.map((name) => {
          const Icon = SCADA_ICONS[name];
          return (
            <div
              key={name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 110,
                height: 90,
                background: "#1a1a2e",
                borderRadius: 8,
                border: "1px solid #2a2a3a",
                gap: 8,
              }}
            >
              <Icon size={24} color="#e5e7eb" />
              <span style={{ fontSize: 10, color: "#9ca3af", textAlign: "center" }}>{name}</span>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p style={{ color: "#6b7280", marginTop: 24 }}>No icons match "{search}"</p>
      )}
    </div>
  );
};
