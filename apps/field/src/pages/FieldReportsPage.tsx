import React from "react";
import { COLORS, useTranslation } from "@gd-monorepo/ui";

export const FieldReportsPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.borderDefault}`,
        borderRadius: "14px",
        padding: "60px 40px",
        textAlign: "center",
        color: COLORS.textMuted,
      }}
    >
      {t("reports.placeholderShort")}
    </div>
  </div>
  );
};
