// packages/ui/src/hooks/usePixiZoom.ts
import { useCallback, useRef, useState, useEffect } from "react";

interface UsePixiZoomOptions {
  enabled: boolean;
  scale?: number;
}

/**
 * PIXI.js stage zoom — magnifying glass pattern.
 * mouseEnter → 2x, mouseMove → pan, mouseLeave → reset.
 *
 * Returns an `onAppInit` callback to wire into `<Application onInit={...}>`.
 */
export function usePixiZoom(options: UsePixiZoomOptions) {
  const { enabled, scale = 2 } = options;
  const appRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const onAppInit = useCallback((app: any) => {
    appRef.current = app;
    setReady(true);
  }, []);

  const resetStage = useCallback(() => {
    const app = appRef.current;
    if (!app?.stage) return;
    app.stage.scale.set(1);
    app.stage.position.set(0, 0);
  }, []);

  const onMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled || !ready) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const app = appRef.current;
      if (!app?.stage) return;
      app.stage.scale.set(scale);
      app.stage.position.set((1 - scale) * x, (1 - scale) * y);
    },
    [enabled, ready, scale],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled || !ready) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const app = appRef.current;
      if (!app?.stage) return;
      app.stage.position.set((1 - scale) * x, (1 - scale) * y);
    },
    [enabled, ready, scale],
  );

  const onMouseLeave = useCallback(() => {
    if (!enabled || !ready) return;
    resetStage();
  }, [enabled, ready, resetStage]);

  useEffect(() => {
    if (!enabled && ready) {
      resetStage();
    }
  }, [enabled, ready, resetStage]);

  return { onMouseEnter, onMouseMove, onMouseLeave, onAppInit };
}
