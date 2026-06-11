// apps/web/src/features/auth/types/user.ts
export interface User {
  id: number;
  username: string;
  password?: string;
  role: "admin" | "teknik";
  name: string;
}