import styled from "@emotion/styled";

export const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
`;

export const LoginCard = styled.div`
  background: #1f1f2e;
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border: 1px solid #2a2a3a;
`;

export const LoginHeader = styled.div`
  text-align: center;
  margin-bottom: 32px;

  h1 {
    font-size: 32px;
    margin-bottom: 8px;
    color: #e5e7eb;
  }

  p {
    color: #9ca3af;
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
    color: #9ca3af;
    font-size: 13px;
    font-weight: 500;
  }

  input {
    background: #0f0f1a;
    border: 1px solid #2a2a3a;
    border-radius: 10px;
    padding: 12px 16px;
    color: #e5e7eb;
    font-size: 14px;
    transition: all 0.2s;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px #3b82f620;
    }
  }
`;

export const ErrorMessage = styled.div`
  background: #ef444420;
  color: #ef4444;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
`;

export const LoginBtn = styled.button`
  background: #3b82f6;
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
    background: #2563eb;
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
  border-top: 1px solid #2a2a3a;
  text-align: center;

  p {
    color: #9ca3af;
    font-size: 12px;
    margin-bottom: 8px;
  }
`;

export const DemoUsers = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 11px;
  color: #6b7280;
`;
