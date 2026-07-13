import React, { useCallback } from "react";
import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";
import type { DeviceType } from "@gd-monorepo/device-library";
import { useEditorStore } from "../features/editor/stores/editorStore";

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: #0f1117;
  color: ${COLORS.textWhite};
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

export const EditorPage: React.FC = () => {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const pushSnapshot = useEditorStore((s) => s.pushSnapshot);
  const removeDevice = useEditorStore((s) => s.removeDevice);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (
          selectedNodeId &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "SELECT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          removeDevice(selectedNodeId);
        }
      }
    },
    [undo, redo, selectedNodeId, removeDevice],
  );

  React.useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const LazyToolbar = React.lazy(
    () => import("../features/editor/components/EditorToolbar"),
  );
  const LazyPalette = React.lazy(
    () => import("../features/editor/components/DevicePalette"),
  );
  const LazyCanvas = React.lazy(
    () => import("../features/editor/components/EditorCanvas"),
  );
  const LazyPanel = React.lazy(
    () => import("../features/editor/components/PropertyPanel"),
  );

  return (
    <Layout>
      <React.Suspense
        fallback={
          <div style={{ padding: 8, color: COLORS.textMuted }}>Yukleniyor...</div>
        }
      >
        <LazyToolbar />
      </React.Suspense>
      <Body>
        <React.Suspense fallback={null}>
          <LazyPalette />
        </React.Suspense>
        <React.Suspense fallback={null}>
          <LazyCanvas />
        </React.Suspense>
        <React.Suspense fallback={null}>
          <LazyPanel />
        </React.Suspense>
      </Body>
    </Layout>
  );
};
