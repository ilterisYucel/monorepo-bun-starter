import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const AppLayout = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${COLORS.bgApp};
  overflow-x: hidden;
`;

export const MainContent = styled.div<{ sidebarCollapsed: boolean; $sidebarWidth?: number }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  margin-left: ${({ sidebarCollapsed, $sidebarWidth }) =>
    $sidebarWidth ? `${$sidebarWidth}px` : sidebarCollapsed ? "70px" : "260px"};
  transition: margin-left 0.3s ease;
  min-width: 0;

  @media (max-width: 768px) {
    margin-left: 70px;
  }
`;

export const PageContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 24px 8px;
  min-width: 0;
`;
