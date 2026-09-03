import { z } from "zod";

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const CreateUserRequestSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(4).max(100),
  role: z.enum(["admin", "teknik", "guest", "boss", "developer"]),
  name: z.string().min(1).max(200),
  fieldIds: z.array(z.string().uuid()).optional(),
});

export const UpdateUserRequestSchema = z.object({
  username: z.string().min(1).max(100).optional(),
  password: z.string().min(4).max(100).optional(),
  role: z.enum(["admin", "teknik", "guest", "boss", "developer"]).optional(),
  name: z.string().min(1).max(200).optional(),
  fieldIds: z.array(z.string().uuid()).optional(),
});

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

/** Faz 1 T1.6 — zorunlu şifre değişimi isteği. */
export const ChangePasswordRequestSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

/** Faz 6 T6.1 — MFA giriş adımı: ara token + 6 haneli kod/kurtarma kodu. */
export const MfaLoginRequestSchema = z.object({
  mfaToken: z.string().min(10),
  code: z.string().min(6).max(16),
});

/** Faz 6 T6.1 — MFA kaydını tamamlama (ilk doğrulama kodu). */
export const MfaEnrollConfirmRequestSchema = z.object({
  code: z.string().min(6).max(16),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
