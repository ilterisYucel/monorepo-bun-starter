import React, { useCallback, useRef, useMemo } from "react";
import styled from "@emotion/styled";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Connection,
  type XYPosition,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { COLORS, SCADA_ICONS } from "@gd-monorepo/ui";
import { DEVICE_LIBRARY, type DeviceType } from "@gd-monorepo/device-library";
import { useEditorStore } from "../stores/editorStore";

const Wrapper = styled.div`
  flex: 1;
  background: #0f1117;
  position: relative;
`;

const EmptyHint = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: ${COLORS.textMuted};
  font-size: 14px;
  pointer-events: none;
  z-index: 0;
`;

function DeviceNodeComponent({ data }: { data: { deviceType: DeviceType; name: string } }) {
  const def = DEVICE_LIBRARY[data.deviceType];
  const IconComponent = SCADA_ICONS[def.icon];

  return (
    <div
      css={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "12px 20px",
        background: "#1a1d27",
        border: `2px solid ${COLORS.success}`,
        borderRadius: 10,
        minWidth: 120,
        cursor: "pointer",
      }}
    >
      <div css={{ color: COLORS.success }}>
        <IconComponent size={24} />
      </div>
      <span
        css={{
          color: COLORS.textWhite,
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {data.name}
      </span>
      <span
        css={{
          color: COLORS.textMuted,
          fontSize: 10,
          textTransform: "uppercase",
        }}
      >
        {def.displayName}
      </span>
    </div>
  );
}

const nodeTypes = {
  deviceNode: DeviceNodeComponent,
};

export const EditorCanvas: React.FC = () => {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const onConnect = useEditorStore((s) => s.onConnect);
  const selectNode = useEditorStore((s) => s.selectNode);
  const addDevice = useEditorStore((s) => s.addDevice);

  const reactFlowRef = useRef<ReactFlowInstance | null>(null);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const deviceType = event.dataTransfer.getData("application/scada-device") as DeviceType;
      if (!deviceType || !DEVICE_LIBRARY[deviceType]) return;

      const rfInstance = reactFlowRef.current;
      if (!rfInstance) return;

      const position: XYPosition = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addDevice(deviceType, position);
    },
    [addDevice],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const connectEndpoints = useCallback(
    (connection: Connection) => {
      onConnect(connection);
      return true;
    },
    [onConnect],
  );

  return (
    <Wrapper onDragOver={onDragOver} onDrop={onDrop}>
      {nodes.length === 0 && (
        <EmptyHint>
          Cihazlari surukleyip birakarak tek hat semasi cizin
        </EmptyHint>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={connectEndpoints}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onInit={(instance) => {
          reactFlowRef.current = instance;
        }}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Shift"]}
      >
        <Background color={COLORS.borderStroke} gap={20} />
        <Controls />
        <MiniMap
          style={{ background: "#1a1d27" }}
          maskColor="rgba(0,0,0,0.5)"
        />
      </ReactFlow>
    </Wrapper>
  );
};
