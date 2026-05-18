import React, { useState } from "react";
import { useAuth } from "../../stores/AuthStore";

export const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const success = await login(username, password);

    if (!success) {
      setError("Kullanıcı adı veya şifre hatalı!");
    }
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🔋 Battery Rack Controller</h1>
          <p>Giriş Yap</p>
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

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" className="btn-login" disabled={isLoading}>
            {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <div className="login-info">
          <p>Demo Kullanıcılar:</p>
          <div className="demo-users">
            <div className="demo-user">
              <span className="badge badge-blue">Teknik</span>
              <span>teknik / teknik123</span>
            </div>
            <div className="demo-user">
              <span className="badge badge-green">Admin</span>
              <span>admin / admin123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
