import React from "react";
import { COLORS } from "@gd-monorepo/ui";

export const FieldControlPage: React.FC = () => (
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
      Saha seviyesi manevralar — ManeuverPanel eklenecek
    </div>
  </div>
);
