import { z } from "zod";

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const CreateUserRequestSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(4).max(100),
  role: z.enum(["admin", "teknik", "guest"]),
  name: z.string().min(1).max(200),
});

export const UpdateUserRequestSchema = z.object({
  username: z.string().min(1).max(100).optional(),
  password: z.string().min(4).max(100).optional(),
  role: z.enum(["admin", "teknik", "guest"]).optional(),
  name: z.string().min(1).max(200).optional(),
});

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
