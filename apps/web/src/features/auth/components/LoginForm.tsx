// apps/web/src/features/auth/components/LoginForm.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./LoginForm.css";

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
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🔋 EMS</h1>
          <p>Enerji Yönetim Sistemi</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Kullanıcı Adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="teknik / admin"
              required
            />
          </div>
          <div className="form-group">
            <label>Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="teknik123 / admin123"
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
        <div className="login-info">
          <p>Demo Kullanıcılar:</p>
          <div className="demo-users">
            <span>teknik / teknik123</span>
            <span>admin / admin123</span>
          </div>
        </div>
      </div>
    </div>
  );
};
