import React, { useCallback } from "react";
import styled from "@emotion/styled";
import { COLORS, SCADA_ICONS } from "@gd-monorepo/ui";
import { DEVICE_LIBRARY } from "@gd-monorepo/device-library";
import type { ProtocolType } from "@gd-monorepo/device-library";
import { useEditorStore } from "../stores/editorStore";
import { ModbusConfigForm } from "./ModbusConfigForm";

const Panel = styled.div`
  width: 300px;
  background: #1a1d27;
  border-left: 1px solid #2e303a;
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #2e303a;
`;

const PanelTitle = styled.h3`
  color: ${COLORS.textWhite};
  font-size: 13px;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${COLORS.textMuted};
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: ${COLORS.textWhite};
  }
`;

const PanelBody = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  color: ${COLORS.textMuted};
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  background: #0f1117;
  border: 1px solid #2e303a;
  border-radius: 6px;
  color: ${COLORS.textWhite};
  padding: 8px 10px;
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: ${COLORS.success};
  }
`;

const Select = styled.select`
  background: #0f1117;
  border: 1px solid #2e303a;
  border-radius: 6px;
  color: ${COLORS.textWhite};
  padding: 8px 10px;
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: ${COLORS.success};
  }

  option {
    background: #1a1d27;
    color: ${COLORS.textWhite};
  }
`;

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: transparent;
  border: 1px solid ${COLORS.error};
  border-radius: 6px;
  color: ${COLORS.error};
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.15s;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: ${COLORS.textMuted};
  font-size: 13px;
  padding: 40px 20px;
  text-align: center;
  gap: 8px;
`;

const PROTOCOL_OPTIONS: { value: ProtocolType; label: string }[] = [
  { value: "modbus", label: "Modbus TCP/RTU" },
  { value: "canbus", label: "CAN Bus" },
  { value: "serial", label: "Seri Port" },
  { value: "timeseries", label: "TimeSeries DB" },
];

export const PropertyPanel: React.FC = () => {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const nodes = useEditorStore((s) => s.nodes);
  const selectNode = useEditorStore((s) => s.selectNode);
  const updateDeviceConfig = useEditorStore((s) => s.updateDeviceConfig);
  const removeDevice = useEditorStore((s) => s.removeDevice);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleClose = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const handleDelete = useCallback(() => {
    if (selectedNodeId) {
      removeDevice(selectedNodeId);
    }
  }, [selectedNodeId, removeDevice]);

  if (!selectedNode) {
    return (
      <Panel>
        <PanelHeader>
          <PanelTitle>Ozellikler</PanelTitle>
        </PanelHeader>
        <EmptyState>
          <SCADA_ICONS.logInfo size={32} />
          Duzenlemek icin bir cihaz secin
        </EmptyState>
      </Panel>
    );
  }

  const def = DEVICE_LIBRARY[selectedNode.data.deviceType];

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{selectedNode.data.name}</PanelTitle>
        <CloseButton onClick={handleClose}>
          <SCADA_ICONS.close size={16} />
        </CloseButton>
      </PanelHeader>
      <PanelBody>
        <FieldGroup>
          <Label>Cihaz Adi</Label>
          <Input
            value={selectedNode.data.name}
            onChange={(e) =>
              updateDeviceConfig(selectedNode.id, { name: e.target.value })
            }
          />
        </FieldGroup>

        <FieldGroup>
          <Label>Protokol</Label>
          <Select
            value={selectedNode.data.protocol ?? ""}
            onChange={(e) =>
              updateDeviceConfig(selectedNode.id, {
                protocol: (e.target.value || undefined) as
                  | ProtocolType
                  | undefined,
              })
            }
          >
            <option value="">Seciniz...</option>
            {PROTOCOL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FieldGroup>

        {selectedNode.data.protocol === "modbus" && (
          <ModbusConfigForm
            connectionConfig={
              (selectedNode.data.connectionConfig as Record<string, unknown>) ?? {}
            }
            onUpdate={(config) =>
              updateDeviceConfig(selectedNode.id, { connectionConfig: config })
            }
          />
        )}

        {selectedNode.data.protocol &&
          selectedNode.data.protocol !== "modbus" && (
            <div
              css={{
                color: COLORS.textMuted,
                fontSize: 12,
                padding: "8px 0",
              }}
            >
              {selectedNode.data.protocol} konfigurasyonu daha sonra
              eklenecek.
            </div>
          )}

        <DeleteButton onClick={handleDelete}>
          <SCADA_ICONS.trash size={14} />
          Cihazi Sil
        </DeleteButton>
      </PanelBody>
    </Panel>
  );
};
