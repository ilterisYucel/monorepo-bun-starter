import styled from "@emotion/styled";

export const Container = styled.div`
  position: relative;
  background: #1f1f2e;
  border-radius: 16px;
  border: 1px solid #2a2a3a;
  overflow: hidden;
`;

export const Loading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
`;

export const RefreshButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #3d3d5e;
  border-radius: 6px;
  background: #1a1a2e;
  color: #9ca3af;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: #2a2a3e;
    color: #e5e7eb;
  }
`;
