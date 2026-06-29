import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${COLORS.bgApp} 0%, ${COLORS.bgCard} 100%);
`;

export const LoginCard = styled.div`
  background: ${COLORS.bgPopup};
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border: 1px solid ${COLORS.borderDefault};
`;

export const LoginHeader = styled.div`
  text-align: center;
  margin-bottom: 32px;

  h1 {
    font-size: 32px;
    margin-bottom: 8px;
    color: ${COLORS.textPrimary};
  }

  p {
    color: ${COLORS.textMuted};
    font-size: 14px;
  }
`;

export const LoginFormElement = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    color: ${COLORS.textMuted};
    font-size: 13px;
    font-weight: 500;
  }

  input {
    background: ${COLORS.bgApp};
    border: 1px solid ${COLORS.borderDefault};
    border-radius: 10px;
    padding: 12px 16px;
    color: ${COLORS.textPrimary};
    font-size: 14px;
    transition: all 0.2s;

    &:focus {
      outline: none;
      border-color: ${COLORS.info};
      box-shadow: 0 0 0 2px ${COLORS.infoAlpha12};
    }
  }
`;

export const ErrorMessage = styled.div`
  background: ${COLORS.errorAlpha12};
  color: ${COLORS.error};
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
`;

export const LoginBtn = styled.button`
  background: ${COLORS.info};
  border: none;
  border-radius: 10px;
  padding: 12px;
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;

  &:hover:not(:disabled) {
    background: ${COLORS.infoHover};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const LoginInfo = styled.div`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid ${COLORS.borderDefault};
  text-align: center;

  p {
    color: ${COLORS.textMuted};
    font-size: 12px;
    margin-bottom: 8px;
  }
`;

export const DemoUsers = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 11px;
  color: ${COLORS.textDisabled};
`;

export const GuestDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 8px;

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: ${COLORS.borderDefault};
  }

  span {
    color: ${COLORS.textDisabled};
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

export const GuestBtn = styled.button`
  width: 100%;
  background: transparent;
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 10px;
  padding: 10px;
  color: ${COLORS.textMuted};
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${COLORS.borderDefault};
    color: ${COLORS.textPrimary};
    border-color: ${COLORS.info};
  }
`;
