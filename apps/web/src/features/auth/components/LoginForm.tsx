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

    const success = await login(username, password);
    if (success) {
      navigate("/dashboard");
    } else {
      setError("Kullanıcı adı veya şifre hatalı!");
    }
    setIsLoading(false);
  };

  return (
    <S.LoginContainer>
      <S.LoginCard>
        <S.LoginHeader>
          <h1><LogoIcon size={28} /> EMS</h1>
          <p>Enerji Yönetim Sistemi</p>
        </S.LoginHeader>
        <S.LoginFormElement onSubmit={handleSubmit}>
          <S.FormGroup>
            <label>Kullanıcı Adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="teknik / admin"
              required
            />
          </S.FormGroup>
          <S.FormGroup>
            <label>Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="teknik123 / admin123"
              required
            />
          </S.FormGroup>
          {error && <S.ErrorMessage>{error}</S.ErrorMessage>}
          <S.LoginBtn type="submit" disabled={isLoading}>
            {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </S.LoginBtn>
        </S.LoginFormElement>
        <S.LoginInfo>
          <p>Demo Kullanıcılar:</p>
          <S.DemoUsers>
            <span>teknik / teknik123</span>
            <span>admin / admin123</span>
          </S.DemoUsers>
        </S.LoginInfo>
      </S.LoginCard>
    </S.LoginContainer>
  );
};
