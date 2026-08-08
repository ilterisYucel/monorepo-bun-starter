import React from "react";
import { COLORS, useTranslation } from "@gd-monorepo/ui";

export const FieldControlPage: React.FC = () => {
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
      {t("field.controlPlaceholder")}
    </div>
  </div>
  );
};
