import styled from "@emotion/styled";

export const LogoutBtn = styled.button<{ collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #ef444420;
  border: 1px solid #ef444640;
  color: #ef4444;
  padding: ${({ collapsed }) => (collapsed ? "9px 0" : "8px")};
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ef444430;
    border-color: #ef444480;
  }
`;

export const LogoutText = styled.span`
  font-size: 13px;
  font-weight: 500;
`;
