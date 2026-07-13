import React from "react";
import { COLORS } from "@gd-monorepo/ui";

interface ModbusConfigFormProps {
  connectionConfig: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
}

const styles = {
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  input: {
    background: "#0f1117",
    border: "1px solid #2e303a",
    borderRadius: 6,
    color: COLORS.textWhite,
    padding: "8px 10px",
    fontSize: 13,
    outline: "none",
  },
  select: {
    background: "#0f1117",
    border: "1px solid #2e303a",
    borderRadius: 6,
    color: COLORS.textWhite,
    padding: "8px 10px",
    fontSize: 13,
    outline: "none",
  },
  section: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginTop: 8,
    paddingBottom: 4,
    borderBottom: "1px solid #2e303a",
  } as React.CSSProperties,
};

export const ModbusConfigForm: React.FC<ModbusConfigFormProps> = ({
  connectionConfig,
  onUpdate,
}) => {
  const handleChange = (key: string, value: unknown) => {
    onUpdate({ ...connectionConfig, [key]: value });
  };

  const connectionType = (connectionConfig.type as string) ?? "tcp";

  return (
    <>
      <div style={styles.section}>Modbus Baglantisi</div>

      <div style={styles.fieldGroup}>
        <div style={styles.label}>Baglanti Tipi</div>
        <select
          style={styles.select}
          value={connectionType}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            handleChange("type", e.target.value)
          }
        >
          <option value="tcp">TCP</option>
          <option value="rtu">RTU</option>
        </select>
      </div>

      {connectionType === "tcp" ? (
        <>
          <div style={styles.fieldGroup}>
            <div style={styles.label}>Host / IP</div>
            <input
              style={styles.input}
              placeholder="192.168.1.100"
              value={(connectionConfig.host as string) ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange("host", e.target.value)
              }
            />
          </div>
          <div style={styles.fieldGroup}>
            <div style={styles.label}>Port</div>
            <input
              style={styles.input}
              placeholder="502"
              type="number"
              value={(connectionConfig.port as string) ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange("port", parseInt(e.target.value) || undefined)
              }
            />
          </div>
        </>
      ) : (
        <div style={styles.fieldGroup}>
          <div style={styles.label}>Seri Port</div>
          <input
            style={styles.input}
            placeholder="/dev/ttyUSB0"
            value={(connectionConfig.port as string) ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleChange("port", e.target.value)
            }
          />
        </div>
      )}

      <div style={styles.fieldGroup}>
        <div style={styles.label}>Slave ID (1-247)</div>
        <input
          style={styles.input}
          placeholder="1"
          type="number"
          min={1}
          max={247}
          value={(connectionConfig.slaveId as string) ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleChange("slaveId", parseInt(e.target.value) || undefined)
          }
        />
      </div>
    </>
  );
};
