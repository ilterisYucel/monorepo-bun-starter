import React from "react";
import { COLORS, SCADA_ICONS } from "@gd-monorepo/ui";
import type { User } from "@/features/auth/types/user";
import { useDeleteUser } from "../hooks/useUserManagement";
import { useAuth } from "@/features/auth/hooks/useAuth";
import styled from "@emotion/styled";

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Th = styled.th`
  text-align: left;
  padding: 8px 12px;
  color: ${COLORS.textMuted};
  font-weight: 500;
  border-bottom: 1px solid ${COLORS.borderDefault};
`;

const Td = styled.td`
  padding: 8px 12px;
  color: ${COLORS.textPrimary};
  border-bottom: 1px solid ${COLORS.borderDefault};
`;

const RoleBadge = styled.span<{ role: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ role }) =>
    role === "admin"
      ? COLORS.errorAlpha12
      : role === "teknik"
        ? COLORS.infoAlpha12
        : COLORS.idleAlpha12};
  color: ${({ role }) =>
    role === "admin"
      ? COLORS.error
      : role === "teknik"
        ? COLORS.info
        : COLORS.textMuted};
`;

const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: ${COLORS.textMuted};
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${COLORS.errorAlpha12};
    color: ${COLORS.error};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const LoadingText = styled.p`
  color: ${COLORS.textMuted};
  font-size: 13px;
  padding: 16px 0;
  text-align: center;
`;

const ErrorText = styled.p`
  color: ${COLORS.error};
  font-size: 13px;
  padding: 16px 0;
  text-align: center;
`;

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  teknik: "Teknik",
  guest: "Misafir",
  boss: "Yönetici",
};

interface UserListProps {
  users: User[];
  isLoading: boolean;
  isError: boolean;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  isLoading,
  isError,
}) => {
  const { user: currentUser } = useAuth();
  const deleteUser = useDeleteUser();
  const TrashIcon = SCADA_ICONS.trash;

  if (isLoading) return <LoadingText>Yükleniyor...</LoadingText>;
  if (isError) return <ErrorText>Kullanıcılar yüklenemedi.</ErrorText>;

  return (
    <Table>
      <thead>
        <tr>
          <Th>Kullanıcı</Th>
          <Th>Ad</Th>
          <Th>Rol</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <Td>{u.username}</Td>
            <Td>{u.name}</Td>
            <Td>
              <RoleBadge role={u.role}>
                {ROLE_LABELS[u.role] ?? u.role}
              </RoleBadge>
            </Td>
            <Td>
              {u.id !== currentUser?.id && (
                <DeleteBtn
                  onClick={() => deleteUser.mutate(u.id)}
                  disabled={deleteUser.isPending}
                  title="Kullanıcıyı sil"
                >
                  <TrashIcon size={14} />
                </DeleteBtn>
              )}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};
