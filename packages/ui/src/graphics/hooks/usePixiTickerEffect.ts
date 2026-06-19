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
    const fn = (ticker: Ticker) => {
      if (!mountedRef.current || !gRef.current) return;
      gRef.current.clear();
      draw(gRef.current, ticker.lastTime * 0.001);
    };
    Ticker.shared.add(fn);
    return () => { void Ticker.shared.remove(fn); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return gRef;
}
