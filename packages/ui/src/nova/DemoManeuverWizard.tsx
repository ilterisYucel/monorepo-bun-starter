import React, { useMemo, useState } from "react";
import { COLORS_LIGHT } from "../colors/tokensLight";
import { DemoManeuverCard } from "./DemoManeuverCard";
import type {
  DemoManeuverInput,
  DemoManeuverItem,
  DemoScopeUnit,
} from "./maneuver-types";

/**
 * Manevra sihirbazı (SPEC UC-5/T-23): kapsam → manevra → parametre → onay.
 * Katalog sunucudan gelir (app indirger); bu bileşen yalnız sunum + yerel
 * form durumu tutar. Gerçek yürütme `onExecute` ile app'e devredilir.
 */

export interface DemoExecutePayload {
  name: string;
  kind: "maneuver" | "operation";
  scope: number[];
  params: Record<string, unknown>;
  timer?: { durationSeconds: number };
}

export interface DemoManeuverWizardProps {
  items: DemoManeuverItem[];
  units: DemoScopeUnit[];
  busy?: boolean;
  message?: string;
  error?: string;
  onExecute: (payload: DemoExecutePayload) => void;
}

function defaultParams(item: DemoManeuverItem | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const input of item?.inputs ?? []) {
    if (input.default !== undefined) out[input.name] = input.default;
  }
  return out;
}

export const DemoManeuverWizard: React.FC<DemoManeuverWizardProps> = ({
  items,
  units,
  busy = false,
  message,
  error,
  onExecute,
}) => {
  const visible = useMemo(() => items.filter((i) => !i.hidden), [items]);
  const [selectedName, setSelectedName] = useState<string | undefined>(visible[0]?.name);
  const selected = visible.find((i) => i.name === selectedName) ?? visible[0];

  const [scope, setScope] = useState<Set<number>>(
    () => new Set(units.filter((u) => !u.disabled).map((u) => u.n)),
  );
  const [params, setParams] = useState<Record<string, unknown>>(() => defaultParams(visible[0]));
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [confirm, setConfirm] = useState(false);

  const toggleScope = (n: number) => {
    setConfirm(false);
    setScope((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const selectItem = (item: DemoManeuverItem) => {
    setSelectedName(item.name);
    setParams(defaultParams(item));
    setConfirm(false);
  };

  const setParam = (name: string, value: unknown) => {
    setParams((p) => ({ ...p, [name]: value }));
    setConfirm(false);
  };

  const scopeList = [...scope].sort((a, b) => a - b);
  const canSend = scopeList.length > 0 && selected !== undefined;

  const send = () => {
    if (!selected) return;
    onExecute({
      name: selected.name,
      kind: selected.kind,
      scope: scopeList,
      params,
      ...(selected.timer && timerSeconds > 0
        ? { timer: { durationSeconds: timerSeconds } }
        : {}),
    });
    setConfirm(false);
  };

  return (
    <div style={{ display: "grid", background: COLORS_LIGHT.panel, border: `1px solid ${COLORS_LIGHT.line}`, borderRadius: 6 }}>
      <Step title="1 · Kapsam" right={
        <span>
          <button type="button" style={linkStyle} onClick={() => { setScope(new Set(units.filter((u) => !u.disabled).map((u) => u.n))); setConfirm(false); }}>Tümü</button>
          {" · "}
          <button type="button" style={linkStyle} onClick={() => { setScope(new Set()); setConfirm(false); }}>Temizle</button>
        </span>
      }>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(102px, 1fr))", gap: 6 }}>
          {units.map((u) => {
            const on = scope.has(u.n);
            return (
              <button
                key={u.n}
                type="button"
                disabled={u.disabled}
                aria-pressed={on}
                onClick={() => toggleScope(u.n)}
                style={{
                  textAlign: "left",
                  border: `1px solid ${on ? COLORS_LIGHT.sel : COLORS_LIGHT.line}`,
                  boxShadow: on ? `inset 0 0 0 1px ${COLORS_LIGHT.sel}` : "none",
                  background: on ? `color-mix(in srgb, ${COLORS_LIGHT.sel} 8%, ${COLORS_LIGHT.panel})` : COLORS_LIGHT.panel,
                  borderRadius: 5,
                  padding: "6px 9px",
                  cursor: u.disabled ? "not-allowed" : "pointer",
                  opacity: u.disabled ? 0.45 : 1,
                }}
              >
                <b style={{ display: "block", fontSize: 13, color: COLORS_LIGHT.fg }}>BESS#{u.n}</b>
                <small style={{ fontSize: 11.5, color: COLORS_LIGHT.muted }}>{u.note}</small>
              </button>
            );
          })}
        </div>
      </Step>

      <Step title="2 · Manevra">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
          {visible.map((item) => (
            <DemoManeuverCard key={item.name} item={item} selected={item.name === selected?.name} onSelect={selectItem} />
          ))}
        </div>
      </Step>

      <Step title="3 · Parametreler">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {(selected?.inputs ?? []).map((input) => (
            <InputField key={input.name} input={input} value={params[input.name]} onChange={setParam} />
          ))}
          {selected?.timer ? (
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS_LIGHT.fg }}>Zamanlı durdurma (sn)</span>
              <input
                type="number"
                min={0}
                step={5}
                value={timerSeconds}
                onChange={(e) => { setTimerSeconds(Number(e.target.value) || 0); setConfirm(false); }}
                style={numStyle}
              />
              <small style={{ fontSize: 11.5, color: COLORS_LIGHT.muted }}>0 = süre yok (saniye)</small>
            </label>
          ) : null}
          {(selected?.inputs ?? []).length === 0 && !selected?.timer ? (
            <p style={{ margin: 0, fontSize: 12.5, color: COLORS_LIGHT.muted }}>Bu kayıt parametre almaz.</p>
          ) : null}
        </div>
      </Step>

      <div style={{ padding: "12px 14px 14px", display: "grid", gap: 8, justifyItems: "start" }}>
        <p style={{ margin: 0, fontSize: 13.5, color: COLORS_LIGHT.fg }}>
          <b>{selected?.label ?? "—"}</b> · {scopeList.length ? `BESS#${scopeList.join(", #")}` : "kapsam seçilmedi"}
        </p>
        {error ? <p style={{ margin: 0, color: COLORS_LIGHT.alarm, fontSize: 12.5 }}>{error}</p> : null}
        {!confirm ? (
          <button type="button" disabled={!canSend || busy} onClick={() => setConfirm(true)} style={primaryBtn(canSend && !busy)}>
            Komutu gönder
          </button>
        ) : (
          <div style={{ border: `1px solid ${COLORS_LIGHT.warn}`, background: `color-mix(in srgb, ${COLORS_LIGHT.warn} 8%, ${COLORS_LIGHT.panel})`, borderRadius: 6, padding: "10px 12px", display: "grid", gap: 6 }}>
            <b style={{ color: COLORS_LIGHT.fg }}>Komutu onaylıyor musunuz?</b>
            <p style={{ margin: 0, fontSize: 12.5, color: COLORS_LIGHT.muted }}>
              Onayladığınızda EMS sıralamayı başlatır; aktif manevra varsa yerini alır.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" disabled={busy} onClick={send} style={primaryBtn(!busy)}>Onayla ve başlat</button>
              <button type="button" onClick={() => setConfirm(false)} style={plainBtn()}>Vazgeç</button>
            </div>
          </div>
        )}
        {message ? <p style={{ margin: 0, fontSize: 12.5, color: COLORS_LIGHT.ok }}>{message}</p> : null}
      </div>
    </div>
  );
};

const InputField: React.FC<{
  input: DemoManeuverInput;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}> = ({ input, value, onChange }) => {
  if (input.type === "boolean") {
    return (
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS_LIGHT.fg }}>{input.label ?? input.name}</span>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(input.name, e.target.checked)} />
      </label>
    );
  }
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS_LIGHT.fg }}>{input.label ?? input.name}</span>
      <input
        type={input.type === "string" ? "text" : "number"}
        min={input.min}
        max={input.max}
        step={input.step}
        value={value === undefined ? "" : String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(input.name, input.type === "string" ? raw : Number(raw));
        }}
        style={numStyle}
      />
    </label>
  );
};

const Step: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => (
  <div style={{ padding: "12px 14px 14px", borderTop: `1px solid ${COLORS_LIGHT.line2}` }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
      <h4 style={{ margin: 0, fontSize: 11.5, letterSpacing: "0.09em", textTransform: "uppercase", color: COLORS_LIGHT.muted, fontWeight: 600 }}>
        {title}
      </h4>
      {right}
    </div>
    {children}
  </div>
);

const linkStyle: React.CSSProperties = { background: "none", border: 0, padding: 0, color: COLORS_LIGHT.sel, cursor: "pointer", fontSize: 12.5, fontWeight: 600 };
const numStyle: React.CSSProperties = { width: 110, fontFamily: '"IBM Plex Mono", monospace', padding: "6px 8px", border: `1px solid ${COLORS_LIGHT.line}`, borderRadius: 4, background: COLORS_LIGHT.panel, color: COLORS_LIGHT.fg };
function primaryBtn(enabled: boolean): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${COLORS_LIGHT.fg}`, background: COLORS_LIGHT.fg, color: COLORS_LIGHT.panel, borderRadius: 5, padding: "7px 13px", fontWeight: 600, fontSize: 13.5, cursor: enabled ? "pointer" : "not-allowed", opacity: enabled ? 1 : 0.45 };
}
function plainBtn(): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${COLORS_LIGHT.line}`, background: COLORS_LIGHT.panel2, color: COLORS_LIGHT.fg, borderRadius: 5, padding: "7px 13px", fontWeight: 600, fontSize: 13.5, cursor: "pointer" };
}
