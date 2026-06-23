// packages/ui/src/hooks/usePixiZoom.ts
import { useCallback, useRef, useEffect } from "react";

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

  const onAppInit = useCallback((app: any) => {
    appRef.current = app;
  }, []);

  const resetStage = useCallback(() => {
    const app = appRef.current;
    if (!app?.stage) return;
    app.stage.scale.set(1);
    app.stage.position.set(0, 0);
  }, []);

  const onMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const app = appRef.current;
      if (!app?.stage) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      app.stage.scale.set(scale);
      app.stage.position.set((1 - scale) * x, (1 - scale) * y);
    },
    [enabled, scale],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const app = appRef.current;
      if (!app?.stage) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      app.stage.position.set((1 - scale) * x, (1 - scale) * y);
    },
    [enabled, scale],
  );

  const onMouseLeave = useCallback(() => {
    if (!enabled) return;
    resetStage();
  }, [enabled, resetStage]);

  useEffect(() => {
    if (!enabled) {
      resetStage();
    }
  }, [enabled, resetStage]);

  return { onMouseEnter, onMouseMove, onMouseLeave, onAppInit };
}
