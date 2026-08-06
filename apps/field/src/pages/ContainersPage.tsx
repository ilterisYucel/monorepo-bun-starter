import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { COLORS, ContainerCard } from "@gd-monorepo/ui";
import { useContainerData } from "../features/containers/hooks/useContainerData";

export const ContainersPage: React.FC = () => {
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const { containers } = useContainerData(fieldId ?? "");

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "12px",
        }}
      >
        {containers.map((c) => (
          <ContainerCard
            key={c.containerId}
            containerId={c.containerId}
            name={c.name}
            status={c.status}
            connected={c.connected}
            soc={c.soc}
            powerKw={c.powerKw}
            temperature={c.temperature}
            deviceCount={c.deviceCount}
            activeDeviceCount={c.activeDeviceCount}
            onClick={() => navigate(`/field/${fieldId}/containers/${c.containerId}`)}
          />
        ))}
      </div>
    </div>
  );
};
