import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addEdge, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import type { NodeChange, EdgeChange, Connection, XYPosition } from "@xyflow/react";
import type { DeviceType } from "@gd-monorepo/device-library";
import type { DeviceNodeData, EditorSnapshot } from "../types/editor";

const MAX_UNDO = 50;
let _idCounter = 0;

function generateId(): string {
  return `device-${Date.now()}-${++_idCounter}`;
}

function createSnapshot(state: EditorState): EditorSnapshot {
  return {
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges)),
    selectedNodeId: state.selectedNodeId,
    projectName: state.projectName,
  };
}

function loadSnapshot(snapshot: EditorSnapshot): Partial<EditorState> {
  return {
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    selectedNodeId: snapshot.selectedNodeId,
    projectName: snapshot.projectName,
  };
}

export interface EditorState {
  projectId: string | null;
  projectName: string;
  nodes: Array<{
    id: string;
    type: string;
    position: XYPosition;
    data: DeviceNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    type?: string;
  }>;
  selectedNodeId: string | null;
  undoStack: EditorSnapshot[];
  redoStack: EditorSnapshot[];

  setProjectName: (name: string) => void;
  setProjectId: (id: string | null) => void;
  addDevice: (deviceType: DeviceType, position: XYPosition) => string;
  removeDevice: (id: string) => void;
  updateDevicePosition: (id: string, position: XYPosition) => void;
  updateDeviceConfig: (id: string, config: Partial<DeviceNodeData>) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  selectNode: (id: string | null) => void;
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      projectId: null,
      projectName: "Yeni Proje",
      nodes: [],
      edges: [],
      selectedNodeId: null,
      undoStack: [],
      redoStack: [],

      setProjectName: (name: string) => {
        get().pushSnapshot();
        set({ projectName: name });
      },

      setProjectId: (id: string | null) => {
        set({ projectId: id });
      },

      addDevice: (deviceType: DeviceType, position: XYPosition): string => {
        const state = get();
        const id = generateId();
        const existingCount = state.nodes.filter(
          (n) => n.data?.deviceType === deviceType,
        ).length;

        state.pushSnapshot();
        set({
          nodes: [
            ...state.nodes,
            {
              id,
              type: "deviceNode",
              position,
              data: {
                deviceType,
                name: `${deviceType.replace(/_/g, " ")} ${existingCount + 1}`,
                registers: [],
              },
            },
          ],
        });

        return id;
      },

      removeDevice: (id: string) => {
        get().pushSnapshot();
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter(
            (e) => e.source !== id && e.target !== id,
          ),
          selectedNodeId:
            state.selectedNodeId === id ? null : state.selectedNodeId,
        }));
      },

      updateDevicePosition: (id: string, position: XYPosition) => {
        get().pushSnapshot();
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, position } : n,
          ),
        }));
      },

      updateDeviceConfig: (id: string, config: Partial<DeviceNodeData>) => {
        get().pushSnapshot();
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...config } } : n,
          ),
        }));
      },

      onNodesChange: (changes: NodeChange[]) => {
        set((state) => ({
          nodes: applyNodeChanges(changes, state.nodes) as typeof state.nodes,
        }));
      },

      onEdgesChange: (changes: EdgeChange[]) => {
        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges) as typeof state.edges,
        }));
      },

      onConnect: (connection: Connection) => {
        get().pushSnapshot();
        set((state) => ({
          edges: addEdge(connection, state.edges),
        }));
      },

      selectNode: (id: string | null) => {
        set({ selectedNodeId: id });
      },

      pushSnapshot: () => {
        const state = get();
        const snapshot = createSnapshot(state);
        set({
          undoStack: [snapshot, ...state.undoStack].slice(0, MAX_UNDO),
          redoStack: [],
        });
      },

      undo: () => {
        const state = get();
        if (state.undoStack.length === 0) return;
        const current = createSnapshot(state);
        const [prev, ...rest] = state.undoStack;
        set({
          ...loadSnapshot(prev!),
          undoStack: rest,
          redoStack: [current, ...state.redoStack].slice(0, MAX_UNDO),
        });
      },

      redo: () => {
        const state = get();
        if (state.redoStack.length === 0) return;
        const current = createSnapshot(state);
        const [next, ...rest] = state.redoStack;
        set({
          ...loadSnapshot(next!),
          undoStack: [current, ...state.undoStack].slice(0, MAX_UNDO),
          redoStack: rest,
        });
      },
    }),
    {
      name: "editor-storage",
      partialize: (state) => ({
        projectId: state.projectId,
        projectName: state.projectName,
        nodes: state.nodes,
        edges: state.edges,
        selectedNodeId: state.selectedNodeId,
      }),
    },
  ),
);
