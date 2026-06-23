// apps/web/src/features/auth/types/user.ts
export interface User {
  id: string;
  username: string;
  role: "admin" | "teknik" | "guest";
  name: string;
}