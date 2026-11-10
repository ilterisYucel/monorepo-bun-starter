import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { COLORS, useTranslation } from "@gd-monorepo/ui";
import { useContainerData } from "../features/containers/hooks/useContainerData";
import { deriveAllPcsSummaries } from "../features/pcs/hooks/derivePcsSummaries";
import { PcsSection } from "../features/pcs/components/PcsSection";

/**
 * 2026-09-02 — PCS sayfası: sahadaki her PCS için summary kartlar satırı +
 * PcsCard/grafik satırı. Veri konteyner snapshot'larından türetilir
 * (1 konteyner = 1 PCS). PCS yoksa bilgi metni gösterilir.
 */
export const FieldPcsPage: React.FC = () => {
  const { t } = useTranslation();
  const { fieldId } = useParams<{ fieldId: string }>();
  const { containers, isLoading } = useContainerData(fieldId ?? "");

  const pcsList = useMemo(() => deriveAllPcsSummaries(containers), [containers]);

  if (isLoading) {
    return <div style={{ padding: "20px", color: COLORS.textMuted }}>{t("common.loading")}</div>;
  }

  if (pcsList.length === 0) {
    return (
      <div style={{ padding: "20px", color: COLORS.textMuted }}>
        {t("pcs.none")}
      </div>
    );
  }

  return (
    <div>
      {pcsList.map((pcs) => (
        <PcsSection key={pcs.pcsId} fieldId={fieldId ?? ""} pcs={pcs} />
      ))}
    </div>
  );
};
