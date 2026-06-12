// packages/ui/src/core/TelemetryInput/TelemetryInput.styles.ts
import styled from "@emotion/styled";

export const Container = styled.div<{
  disabled?: boolean;
  size?: "small" | "medium" | "large";
}>`
  background: #1a1a2e;
  border: 1px solid ${(props) => (props.disabled ? "#2a2a3a" : "#3a3a4a")};
  border-radius: 12px;
  transition: all 0.2s ease;
  width: 100%;
  padding: ${(props) =>
    props.size === "small" ? "12px" : props.size === "large" ? "20px" : "16px"};
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "default")};
  box-sizing: border-box;

  ${(props) =>
    !props.disabled &&
    `
    &:hover {
      border-color: #3b82f6;
      background: #1f1f2e;
    }
  `}
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0px 8px;
`;

export const LabelSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

export const Name = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #e5e7eb;
`;

export const DeviceId = styled.span`
  font-size: 11px;
  color: #6b7280;
  background: #2a2a3a;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
`;

export const TagsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`;

export const Tag = styled.span`
  font-size: 10px;
  color: #9ca3af;
  background: #2a2a3a;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #3a3a4a;
`;

// 🔥 Input Group - tek bg rengi, içindeki her şey aynı renkte
export const InputGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #0f0f1a;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  padding: 8px 16px;
  transition: all 0.2s;

  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px #3b82f620;
  }
`;

// Sol kısım: Input + Unit (sola yaslı)
export const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

export const ValueInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: #e5e7eb;
  font-family: monospace;
  font-size: 20px;
  font-weight: 500;
  text-align: left;
  outline: none;

  &:focus {
    outline: none;
  }
`;

export const Unit = styled.span`
  background: transparent;
  color: #9ca3af;
  font-size: 14px;
  font-weight: 500;
  min-width: 40px;
  text-align: center;
`;

// Sağ kısım: Ok tuşları (sağa yaslı)
export const Controls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: auto;
`;

export const ControlBtn = styled.button`
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 22px;
  font-size: 14px;
  transition: transform 0.1s ease;

  &:active {
    transform: scale(0.9);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 8px;
  min-height: 20px; // 🔥 description olmasa bile yükseklik korunsun
`;

export const Description = styled.div`
  font-size: 11px;
  color: #e5e7eb;
  line-height: 1.4;
  text-align: left;
`;

export const LimitIndicator = styled.div`
  display: flex;
  gap: 12px;
  font-size: 10px;
  color: #9ca3af;
  font-family: monospace;
  margin-left: auto; // 🔥 her zaman sağda
`;

export const LimitBadge = styled.span<{ isMin?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;
