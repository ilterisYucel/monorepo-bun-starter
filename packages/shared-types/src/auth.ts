export type Role = "admin" | "teknik" | "guest" | "boss" | "developer";

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
  fieldIds?: string[];
  /** İlk girişte zorunlu şifre değişimi bekleniyor mu? (Faz 1 T1.6) */
  mustChangePassword?: boolean;
  /** MFA (TOTP) kaydı tamamlandı mı? (Faz 6 T6.1 — access token claim'i) */
  mfaEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

/** Faz 6 T6.1 — MFA giriş adımı: ara token + kullanıcının girdiği kod. */
export interface MfaLoginRequest {
  mfaToken: string;
  code: string;
}

/** Faz 6 T6.1 — MFA kaydını tamamlama isteği (ilk doğrulama kodu). */
export interface MfaEnrollConfirmRequest {
  code: string;
}

/** Faz 6 T6.1 — login şifre adımı başarılı ama MFA gerekiyor yanıtı. */
export interface MfaRequiredResponse {
  mfaRequired: true;
  mfaToken: string;
  user: User;
}

/** Faz 6 T6.1 — MFA kayıt adımı yanıtı (otpauth URI + gösterilecek sır). */
export interface MfaEnrollResponse {
  secret: string;
  otpauthUri: string;
}

/** Faz 6 T6.1 — kayıt tamamlanınca dönen tek kullanımlık kurtarma kodları. */
export interface MfaConfirmResponse {
  recoveryCodes: string[];
  user: User;
  /** Kayıtla birlikte YENİ token'lar (access claim'i mfaEnabled=true). */
  accessToken: string;
  refreshToken: string;
  /** Etkin MFA roller listesi (route katmanında eklenir — bkz. AuthResponse). */
  mfaRequiredRoles?: Role[];
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: Role;
  name: string;
  fieldIds?: string[];
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  role?: Role;
  name?: string;
  fieldIds?: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  /**
   * Faz 6 T6.1 — MFA zorunlu roller (sunucu config'inden; route katmanında
   * eklenir). Frontend guard'ları hardcoded rol listesi yerine bunu kullanır
   * (MFA_ENABLED=false debug flag'iyle enforcement tamamen kapanabilir).
   */
  mfaRequiredRoles?: Role[];
}

export interface RefreshRequest {
  refreshToken: string;
}
