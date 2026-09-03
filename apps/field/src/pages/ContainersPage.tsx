import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ContainerCard, COLORS, SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import { useContainerData, CONTAINERS_QUERY_KEY } from "../features/containers/hooks/useContainerData";
import { RegisterContainerForm } from "../features/containers/components/RegisterContainerForm";
import { Modal } from "../features/ui";
import { useAuthStore } from "../features/auth/stores/AuthStore";

const AddIcon = SCADA_ICONS.add;

export const ContainersPage: React.FC = () => {
  const { t } = useTranslation();
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { containers } = useContainerData(fieldId ?? "");
  // Kayıt formu yalnızca admin/boss'a görünür — uç zaten sunucuda kısıtlı
  // (field-routes.ts register: admin/boss); bu UI katmanı gizlemesidir.
  const canRegister = useAuthStore((s) => s.isAdmin || s.isBoss);
  // 2026-08-30: kayıt formu MODAL içinde açılır (sayfa içi inline değil).
  const [registerOpen, setRegisterOpen] = useState(false);

  return (
    <div>
      {canRegister && (
        <button
          onClick={() => setRegisterOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: COLORS.infoDark,
            border: "none",
            borderRadius: "6px",
            color: COLORS.textWhite,
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: "14px",
          }}
        >
          <AddIcon size={16} />
          {t("container.register.title")}
        </button>
      )}

      <Modal
        open={registerOpen}
        title={t("container.register.title")}
        onClose={() => setRegisterOpen(false)}
        width={480}
      >
        <RegisterContainerForm
          fieldId={fieldId ?? ""}
          onRegistered={() => {
            setRegisterOpen(false);
            void queryClient.invalidateQueries({
              queryKey: CONTAINERS_QUERY_KEY(fieldId ?? ""),
            });
          }}
        />
      </Modal>

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
