import React from "react";
import { SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import { useAuth } from "../hooks/useAuth";
import * as S from "./LogoutButton.styles";

interface LogoutButtonProps {
  collapsed: boolean;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({ collapsed }) => {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const LogoutIcon = SCADA_ICONS.logout;

  return (
    <S.LogoutBtn
      collapsed={collapsed}
      onClick={() => void logout()}
      title={collapsed ? t("auth.logout") : undefined}
    >
      <LogoutIcon size={collapsed ? 18 : 16} />
      {!collapsed && <S.LogoutText>{t("auth.logout")}</S.LogoutText>}
    </S.LogoutBtn>
  );
};
