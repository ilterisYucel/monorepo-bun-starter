import React from "react";
import { SCADA_ICONS } from "@gd-monorepo/ui";
import { useAuth } from "../hooks/useAuth";
import * as S from "./LogoutButton.styles";

interface LogoutButtonProps {
  collapsed: boolean;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({ collapsed }) => {
  const { logout } = useAuth();
  const LogoutIcon = SCADA_ICONS.logout;

  return (
    <S.LogoutBtn
      collapsed={collapsed}
      onClick={logout}
      title={collapsed ? "Çıkış" : undefined}
    >
      <LogoutIcon size={collapsed ? 18 : 16} />
      {!collapsed && <S.LogoutText>Çıkış</S.LogoutText>}
    </S.LogoutBtn>
  );
};