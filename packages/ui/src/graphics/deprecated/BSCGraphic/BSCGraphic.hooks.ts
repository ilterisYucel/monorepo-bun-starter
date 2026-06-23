import { useEffect, useRef, useState, useCallback } from "react";
import { supportsWebGL } from "../../../utils/webgl-detection";

export function useWebGLDetect(): Record<string, unknown> {
  const [useCanvas, setUseCanvas] = useState(false);

  useEffect(() => {
    setUseCanvas(!supportsWebGL());
  }, []);

  if (useCanvas) {
    return { preference: "canvas" as unknown };
  }
  return {};
}

export function usePixiResize(
  containerRef: React.RefObject<HTMLDivElement | null>,
  width: number | string,
) {
  const [dimensions, setDimensions] = useState({ width: 680, height: 340 });
  const [resizeKey, setResizeKey] = useState(0);
  const isMountedRef = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateDimensions = () => {
      if (!containerRef.current || !isMountedRef.current) return;

      let newWidth = containerRef.current.clientWidth;
      if (typeof width === "number") newWidth = width;

      const newHeight = newWidth * 0.38;
      setDimensions({ width: newWidth, height: newHeight });

      // Debounce: sadece CSS transition'ı bittiğinde key'i artır
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setResizeKey((prev) => prev + 1);
        }
      }, 350);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(el);
    updateDimensions();

    return () => {
      resizeObserver.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [width, containerRef]);

  return { dimensions, resizeKey };
}

export function usePixiTicker() {
  const timestampRef = useRef(0);
  const [frameCount, setFrameCount] = useState(0);

  const onInit = useCallback(
    (app: {
      ticker: { add: (fn: (ticker: { deltaMS: number }) => void) => void };
    }) => {
      app.ticker.add((ticker) => {
        timestampRef.current += ticker.deltaMS;
        setFrameCount((prev) => prev + 1);
      });
    },
    [],
  );

  return { timestampRef, frameCount, onInit };
}
