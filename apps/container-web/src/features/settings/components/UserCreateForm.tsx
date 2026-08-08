import React, { useState } from "react";
import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";
import type { Role } from "@gd-monorepo/shared-types";
import { useCreateUser } from "../hooks/useUserManagement";

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
`;

const Row = styled.div`
  display: flex;
  gap: 8px;
`;

const Input = styled.input`
  flex: 1;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid ${COLORS.borderDefault};
  background: ${COLORS.bgInput};
  color: ${COLORS.textPrimary};
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: ${COLORS.accentLight};
  }

  &::placeholder {
    color: ${COLORS.textDisabled};
  }
`;

const Select = styled.select`
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid ${COLORS.borderDefault};
  background: ${COLORS.bgInput};
  color: ${COLORS.textPrimary};
  font-size: 13px;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: ${COLORS.accentLight};
  }
`;

const AddBtn = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: ${COLORS.accentLight};
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ErrorMsg = styled.span`
  color: ${COLORS.error};
  font-size: 12px;
`;

const SuccessMsg = styled.span`
  color: ${COLORS.success};
  font-size: 12px;
`;

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "teknik", label: "Teknik" },
  { value: "guest", label: "Misafir" },
  { value: "boss", label: "Yönetici" },
];

export const UserCreateForm: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("teknik");

  const createUser = useCreateUser();

  const handleSubmit = () => {
    if (!username.trim() || !password.trim() || !name.trim()) return;
    createUser.mutate(
      {
        username: username.trim(),
        password: password.trim(),
        name: name.trim(),
        role,
      },
      {
        onSuccess: () => {
          setUsername("");
          setPassword("");
          setName("");
          setRole("teknik");
        },
      },
    );
  };

  const canSubmit =
    username.trim() !== "" &&
    password.trim() !== "" &&
    name.trim() !== "" &&
    !createUser.isPending;

  return (
    <Form>
      <Row>
        <Input
          placeholder="Kullanıcı Adı"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Row>
      <Row>
        <Input
          placeholder="Ad Soyad"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
        <AddBtn onClick={handleSubmit} disabled={!canSubmit}>
          Ekle
        </AddBtn>
      </Row>
      {createUser.isError && (
        <ErrorMsg>
          {(createUser.error as any)?.response?.data?.error ??
            "Kullanıcı eklenemedi."}
        </ErrorMsg>
      )}
      {createUser.isSuccess && (
        <SuccessMsg>Kullanıcı eklendi.</SuccessMsg>
      )}
    </Form>
  );
};
