import React, { useCallback, useRef } from "react";
import styled from "@emotion/styled";
import { COLORS, SCADA_ICONS } from "@gd-monorepo/ui";
import { useEditorStore } from "../stores/editorStore";

const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #1a1d27;
  border-bottom: 1px solid #2e303a;
  flex-shrink: 0;
`;

const ProjectNameInput = styled.input`
  background: #0f1117;
  border: 1px solid #2e303a;
  border-radius: 6px;
  color: ${COLORS.textWhite};
  padding: 6px 10px;
  font-size: 14px;
  font-weight: 600;
  width: 220px;
  outline: none;

  &:focus {
    border-color: ${COLORS.success};
  }
`;

const ToolbarButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${(p) => (p.disabled ? "#1a1d27" : "#0f1117")};
  border: 1px solid ${(p) => (p.disabled ? "#2e303a" : COLORS.success)};
  border-radius: 6px;
  color: ${(p) => (p.disabled ? COLORS.textMuted : COLORS.textWhite)};
  padding: 6px 12px;
  font-size: 13px;
  cursor: ${(p) => (p.disabled ? "not-allowed" : "pointer")};
  opacity: ${(p) => (p.disabled ? 0.5 : 1)};
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: #2a2d37;
  }
`;

const Spacer = styled.div`
  flex: 1;
`;

const Divider = styled.div`
  width: 1px;
  height: 24px;
  background: #2e303a;
`;

export const EditorToolbar: React.FC = () => {
  const projectName = useEditorStore((s) => s.projectName);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const canUndo = useEditorStore((s) => s.undoStack.length > 0);
  const canRedo = useEditorStore((s) => s.redoStack.length > 0);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const projectId = useEditorStore((s) => s.projectId);

  const handleExport = useCallback(() => {
    const state = useEditorStore.getState();
    const project = {
      version: "1.0",
      name: state.projectName,
      devices: state.nodes.map((n) => ({
        id: n.id,
        type: n.data.deviceType,
        name: n.data.name,
        position: n.position,
        protocol: {
          type: n.data.protocol ?? "modbus",
          config: n.data.connectionConfig ?? {},
        },
        registers: n.data.registers,
      })),
      connections: state.edges.map((e) => ({
        from: e.source,
        to: e.target,
        type: (e.type as "power" | "communication") ?? "power",
      })),
    };

    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.projectName.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleSave = useCallback(async () => {
    const state = useEditorStore.getState();
    try {
      const { apiClient } = await import("../../../lib/api-client");
      const project = {
        name: state.projectName,
        nodes: state.nodes,
        edges: state.edges,
      };

      if (state.projectId) {
        await apiClient.put(`/projects/${state.projectId}`, project);
      } else {
        const res = await apiClient.post("/projects", project);
        useEditorStore.getState().setProjectId(res.data.id);
      }
    } catch {
      console.warn("[EditorToolbar] Backend save failed, using localStorage only");
    }
  }, []);

  return (
    <ToolbarContainer>
      <ProjectNameInput
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="Proje Adi"
      />

      <Divider />

      <ToolbarButton disabled={!canUndo} onClick={undo}>
        <SCADA_ICONS.refresh size={14} />
        Geri Al
      </ToolbarButton>

      <ToolbarButton disabled={!canRedo} onClick={redo}>
        <SCADA_ICONS.refresh size={14} />
        Ileri Al
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={handleSave}>
        <SCADA_ICONS.logSuccess size={14} />
        Kaydet
      </ToolbarButton>

      <Spacer />

      <ToolbarButton onClick={handleExport}>
        <SCADA_ICONS.logInfo size={14} />
        Disari Aktar
      </ToolbarButton>

      <span
        css={{
          color: COLORS.textMuted,
          fontSize: 11,
          marginLeft: 12,
        }}
      >
        {nodes.length} cihaz · {edges.length} baglanti
        {projectId ? " · Kaydedildi" : ""}
      </span>
    </ToolbarContainer>
  );
};
