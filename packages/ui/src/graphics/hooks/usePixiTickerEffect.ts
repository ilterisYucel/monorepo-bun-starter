import { useEffect, useRef } from "react";
import type { Graphics } from "pixi.js";
import { Ticker } from "pixi.js";

export function usePixiTickerEffect(
  draw: (g: Graphics, time: number) => void,
  deps: unknown[],
) {
  const gRef = useRef<Graphics | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const fn = (_ticker: Ticker) => {
      if (!mountedRef.current) return;
      const g = gRef.current;
      if (!g || g.destroyed) return;
      g.clear();
      draw(g, _ticker.lastTime * 0.001);
    };
    Ticker.shared.add(fn);
    return () => {
      Ticker.shared.remove(fn);
      gRef.current = null;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return gRef;
}
