import React, { useEffect, useRef } from "react";
import "./nova-mimic.css";
import {
  createNovaMimic,
  type NovaMimic,
  type OverlayMode,
} from "./nova-mimic";
import type { NovaMimicState, NovaTopology } from "./mimic-types";
import { useRegMode } from "./DemoRegMode";
import { mimicSourceForId } from "./mimic-source-map";
import { sourceKey } from "./register-sources";

export interface DemoMimicProps {
  topology: NovaTopology;
  state: NovaMimicState;
  overlay?: OverlayMode;
  selected?: number | null;
  onSelect?: (n: number) => void;
  onCellSelect?: (cellId: string) => void;
  /** AUX panel kutusu tıklaması (Devices › AUX). */
  onAuxSelect?: () => void;
}

/**
 * DemoMimic — `createNovaMimic` için React sarmalayıcı (SPEC K5/T-13).
 * Mount'ta fabrika kurulur; veri/overlay/seçim değişince imperative API
 * çağrılır. Callback'ler ref üzerinden güncel tutulur (yeniden kurulum yok).
 */
export const DemoMimic: React.FC<DemoMimicProps> = ({
  topology,
  state,
  overlay = "status",
  selected = null,
  onSelect,
  onCellSelect,
  onAuxSelect,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mimicRef = useRef<NovaMimic | null>(null);
  const { mode } = useRegMode();

  const onSelectRef = useRef(onSelect);
  const onCellRef = useRef(onCellSelect);
  const onAuxRef = useRef(onAuxSelect);
  onSelectRef.current = onSelect;
  onCellRef.current = onCellSelect;
  onAuxRef.current = onAuxSelect;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const mimic = createNovaMimic(svg, topology, {
      onSelect: (n) => onSelectRef.current?.(n),
      onCellSelect: (id) => onCellRef.current?.(id),
      onAuxSelect: () => onAuxRef.current?.(),
    });
    mimicRef.current = mimic;
    return () => {
      mimic.destroy();
      mimicRef.current = null;
    };
  }, [topology]);

  useEffect(() => {
    mimicRef.current?.update(state);
  }, [state]);

  useEffect(() => {
    mimicRef.current?.setOverlay(overlay);
  }, [overlay]);

  useEffect(() => {
    mimicRef.current?.setSelected(selected);
  }, [selected]);

  // Regmod: SVG metinlerini register kaynağıyla işaretle (SPEC UC-12, FR-12.5).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.querySelectorAll("text[id]").forEach((t) => {
      const di = t as SVGTextElement;
      const src = mimicSourceForId(di.id);
      di.setAttribute("data-rsk", mode !== "val" && src ? sourceKey(src) : "");
    });
  }, [mode, state, topology]);

  return (
    <svg
      ref={svgRef}
      className="mimic"
      role="img"
      aria-label="Saha yerleşimi ve tek hat şeması"
    />
  );
};
