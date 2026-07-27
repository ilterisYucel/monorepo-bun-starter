import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SCADA_ICONS } from "@gd-monorepo/ui";
import { useAuth } from "../hooks/useAuth";
import * as S from "./LoginForm.styles";

const LogoIcon = SCADA_ICONS.logo;

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Giris basarisiz";
      setError(message);
    }
    setIsLoading(false);
  };

  return (
    <S.LoginContainer>
      <S.LoginCard>
        <S.LoginHeader>
          <h1>
            <LogoIcon size={28} /> EMS
          </h1>
          <p>Enerji Yonetim Sistemi</p>
        </S.LoginHeader>
        <S.LoginFormElement onSubmit={handleSubmit}>
          <S.FormGroup>
            <label>Kullanici Adi</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </S.FormGroup>
          <S.FormGroup>
            <label>Sifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123"
              required
            />
          </S.FormGroup>
          {error && <S.ErrorMessage>{error}</S.ErrorMessage>}
          <S.LoginBtn type="submit" disabled={isLoading}>
            {isLoading ? "Giris yapiliyor..." : "Giris Yap"}
          </S.LoginBtn>
          <S.GuestDivider>
            <span>veya</span>
          </S.GuestDivider>
          <S.GuestBtn type="button" onClick={() => navigate("/dashboard")}>
            Misafir Olarak Devam Et
          </S.GuestBtn>
        </S.LoginFormElement>
        <S.LoginInfo>
          <p>Demo Kullanici:</p>
          <S.DemoUsers>
            <span>admin / admin123</span>
          </S.DemoUsers>
        </S.LoginInfo>
      </S.LoginCard>
    </S.LoginContainer>
  );
};
