import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Shell = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${COLORS.bgApp};
`;

export const Rail = styled.nav`
  display: flex;
  flex-direction: column;
  width: 80px;
  flex-shrink: 0;
  background: ${COLORS.bgHeader};
  border-right: 1px solid ${COLORS.borderDefault};

  @media (max-width: 1024px) {
    display: none;
  }
`;

export const RailBrand = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-bottom: 1px solid ${COLORS.borderDefault};
`;

export const LogoIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: ${COLORS.info};
`;

export const RailNav = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 8px;
`;

export const NavButton = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  background: ${({ $active }) => ($active ? COLORS.infoAlpha12 : "transparent")};
  border: none;
  border-radius: 10px;
  color: ${({ $active }) => ($active ? COLORS.textWhite : COLORS.textMuted)};
  cursor: pointer;
  font-size: 10px;
  font-family: inherit;

  &:hover {
    background: ${COLORS.bgHover};
    color: ${COLORS.textWhite};
  }
`;

export const RailFooter = styled.div`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid ${COLORS.borderDefault};
`;

export const FooterUser = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: ${COLORS.textMuted};
  cursor: default;
`;

export const FooterBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: ${COLORS.textMuted};
  cursor: pointer;

  &:hover {
    background: ${COLORS.bgHover};
    color: ${COLORS.textWhite};
  }
`;

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`;

export const HeaderBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 4px 14px;
  background: ${COLORS.bgSystemBar};
  border-bottom: 1px solid ${COLORS.borderDefault};
  flex-shrink: 0;
`;

export const HeaderGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  width: 100%;

  @media (max-width: 900px) {
    display: none;
  }
`;

export const HeaderBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${COLORS.textPrimary};
`;

export const HeaderLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${COLORS.textLight};
`;

export const HeaderMono = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${COLORS.textPrimary};
  font-variant-numeric: tabular-nums;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
`;

export const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  color: ${COLORS.textMuted};
  cursor: pointer;
  border-radius: 8px;

  &:hover {
    background: ${COLORS.bgHover};
    color: ${COLORS.textWhite};
  }

  @media (min-width: 1025px) {
    display: none;
  }
`;

export const Main = styled.main`
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
`;

export const DrawerBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 30;
  background: ${COLORS.errorAlpha19};
`;

export const Drawer = styled.nav`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  width: 220px;
  display: flex;
  flex-direction: column;
  background: ${COLORS.bgHeader};
  border-right: 1px solid ${COLORS.borderDefault};
  padding: 10px;
`;

export const DrawerBrand = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 6px;
  border-bottom: 1px solid ${COLORS.borderDefault};
  margin-bottom: 8px;
`;

export const DrawerNavButton = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 12px;
  background: ${({ $active }) => ($active ? COLORS.infoAlpha12 : "transparent")};
  border: none;
  border-radius: 10px;
  color: ${({ $active }) => ($active ? COLORS.textWhite : COLORS.textMuted)};
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  text-align: left;

  &:hover {
    background: ${COLORS.bgHover};
    color: ${COLORS.textWhite};
  }
`;

export const NavBadge = styled.span`
  position: absolute;
  top: 4px;
  right: 14px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${COLORS.error};
  border-radius: 8px;
  color: ${COLORS.textWhite};
  font-size: 9px;
  font-weight: 800;
`;
