import styled from "@emotion/styled";

export const Layout = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
`;

export const Main = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-width: 0;
`;

export const SingleLineWrap = styled.div`
  position: relative;
`;

export const InfoAnchor = styled.div`
  position: absolute;
  top: 46px;
  right: 24px;
`;

export const Bottom = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

export const DrawerLayer = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 20;
  overflow-y: auto;
`;

export const FullDrawerPage = styled.div`
  display: flex;
  justify-content: center;
  padding: 24px 0;
`;
