import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { sourceByKey, sourceKey, sourceText, tipHtml, type RegisterSource } from "./register-sources";

/**
 * Register-source (tooltip) modu — referans `app.js#applyRegMode` portu (SPEC UC-12).
 *
 * Üç mod (header segmenti, localStorage persist):
 *   val    — düz değerler (varsayılan)
 *   tip    — değerler noktalı altı çizili; hover'da tam kaynak kartı
 *   inline — değer `adres · device · register adı` metnine döner; hover yine kart
 *
 * `RegisterValue` bir değeri sarar; `RegisterTip` tek global hover kartıdır;
 * `RegisterBar` tür renk lejantıdır. Hepsi saf `register-sources` katmanını tüketir.
 */

export type RegisterMode = "val" | "tip" | "inline";

const STORAGE_KEY = "gdpm.demo.regmode";

interface RegModeCtxValue {
  mode: RegisterMode;
  setMode: (m: RegisterMode) => void;
}

const RegModeCtx = createContext<RegModeCtxValue>({ mode: "val", setMode: () => undefined });

export const useRegMode = (): RegModeCtxValue => useContext(RegModeCtx);

function readStored(): RegisterMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "tip" || v === "inline" ? v : "val";
  } catch {
    return "val";
  }
}

export const RegModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<RegisterMode>(readStored);
  const setMode = useCallback((m: RegisterMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* localStorage yoksa sessizce geç */
    }
  }, []);
  useEffect(() => {
    document.body.classList.toggle("regmode", mode !== "val");
    document.body.classList.toggle("reginline", mode === "inline");
  }, [mode]);
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <RegModeCtx.Provider value={value}>{children}</RegModeCtx.Provider>;
};

const InlineBody: React.FC<{ source: RegisterSource }> = ({ source }) => {
  if (source.kind === "reg") {
    return (
      <>
        <b>{source.addr}</b>
        <i>
          {source.dev}
          {source.ip ? ` ${source.ip}` : ""}
        </i>
        <em>{source.name}</em>
      </>
    );
  }
  if (source.kind === "calc") {
    const inputs = (source.parts ?? [])
      .map((p) => (p.kind === "reg" ? `${p.dev} ${p.addr ?? ""}` : p.name))
      .join(" · ");
    return (
      <>
        <b>calc</b>
        <em>{source.name}</em>
        {inputs ? <i>{inputs}</i> : null}
      </>
    );
  }
  if (source.kind === "nomap") {
    return (
      <>
        <b>no map</b>
        <i>{source.dev}</i>
        <em>{source.name}</em>
      </>
    );
  }
  return (
    <>
      <b>sim</b>
      <em>{source.name}</em>
    </>
  );
};

export interface RegisterValueProps {
  source?: RegisterSource | null;
  children: React.ReactNode;
  className?: string;
  /** `data-rsk` taşımayan düz metin (varsayılan davranış). */
  as?: "span" | "b" | "em" | "td";
}

/** Kaynaklı değer sarmalayıcı: val'de düz, tip/inline'da hover kartı + inline çip. */
export const RegisterValue: React.FC<RegisterValueProps> = ({ source, children, className, as }) => {
  const { mode } = useRegMode();
  if (!source || mode === "val") return <>{children}</>;
  const key = sourceKey(source);
  const Tag = as ?? "span";
  return (
    <Tag
      className={`rv k-${source.kind}${className ? ` ${className}` : ""}`}
      data-rsk={key}
      title={sourceText(source)}
    >
      <span className="rvv">{children}</span>
      <span className="rvs">
        <InlineBody source={source} />
      </span>
    </Tag>
  );
};

/** Tek global hover kaynak kartı (`#rsTip`) — `Document` dinleyicisi. */
export const RegisterTip: React.FC = () => {
  const { mode } = useRegMode();
  const ref = useRef<HTMLDivElement | null>(null);
  const [html, setHtml] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (mode === "val") {
      setVisible(false);
      return undefined;
    }
    let last = "";
    const onMove = (e: PointerEvent): void => {
      const target = e.target instanceof Element ? e.target.closest("[data-rsk]") : null;
      const key = target?.getAttribute("data-rsk") ?? "";
      const src = key ? sourceByKey(key) : undefined;
      if (!src) {
        setVisible(false);
        last = "";
        return;
      }
      const inner = target?.querySelector(".rvv");
      const shown = (inner ?? target)?.textContent ?? "";
      if (`${key}${shown}` !== last) {
        setHtml(tipHtml(src, shown));
        last = `${key}${shown}`;
      }
      setVisible(true);
      const node = ref.current;
      const w = node?.offsetWidth ?? 460;
      const h = node?.offsetHeight ?? 300;
      const left = Math.max(8, e.clientX + 16 + w > window.innerWidth - 8 ? e.clientX - w - 12 : e.clientX + 16);
      const top = Math.max(8, e.clientY + 18 + h > window.innerHeight - 8 ? e.clientY - h - 12 : e.clientY + 18);
      if (node) {
        node.style.left = `${left}px`;
        node.style.top = `${top}px`;
      }
    };
    const onLeave = (): void => setVisible(false);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [mode]);

  return (
    <div
      id="rsTip"
      ref={ref}
      hidden={!visible}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

/** Kaynak türü renk lejantı (regmodda görünür). */
export const RegisterBar: React.FC = () => {
  const { mode } = useRegMode();
  if (mode === "val") return null;
  return (
    <div className="regbar" role="note">
      <b>Register view</b>
      <span className="k-reg">register · device · address · FC · name</span>
      <span className="k-calc">PMS calculation ← registers used</span>
      <span className="k-nomap">device known · register map not supplied</span>
      <span className="k-model">simulation / configuration only</span>
      <span>hover any marked value for the full source card</span>
    </div>
  );
};

export interface RegModeSegmentProps {
  className?: string;
}

/** Header mod segmenti: Values · Tooltip · Inline. */
export const RegModeSegment: React.FC<RegModeSegmentProps> = ({ className }) => {
  const { mode, setMode } = useRegMode();
  return (
    <span
      className={`seg sm${className ? ` ${className}` : ""}`}
      role="group"
      aria-label="Source"
      title="Flip every value to its source: device · register address · register name"
    >
      <small>Source</small>
      <button type="button" aria-pressed={mode === "val"} title="Plain values" onClick={() => setMode("val")}>
        Values
      </button>
      <button
        type="button"
        aria-pressed={mode === "tip"}
        title="Hover a value: device, IP, register address, FC, data type, scale, raw value, poll rate"
        onClick={() => setMode("tip")}
      >
        Tooltip
      </button>
      <button
        type="button"
        aria-pressed={mode === "inline"}
        title="Values flipped to device · address · register name"
        onClick={() => setMode("inline")}
      >
        Inline
      </button>
    </span>
  );
};
