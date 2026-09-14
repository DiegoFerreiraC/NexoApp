import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  UserRound,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";

import { supabase } from "../services/supabase";

import "../styles/auth.css";

import logoNexo from "../assets/nexo-logo.png";

function Login() {
  const navigate = useNavigate();

  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        import.meta.env.VITE_LOGIN_FUNCTION_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            apikey:
              import.meta.env
                .VITE_SUPABASE_PUBLISHABLE_KEY,
          },

          body: JSON.stringify({
            cpf,
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Não foi possível realizar o login."
        );
      }

      if (!result.session) {
        throw new Error(
          "Sessão não retornada pelo servidor."
        );
      }

      const { error: sessionError } =
        await supabase.auth.setSession({
          access_token:
            result.session.access_token,

          refresh_token:
            result.session.refresh_token,
        });

      if (sessionError) {
        throw sessionError;
      }

      if (
        result.profile.must_change_password
      ) {
        navigate("/primeiro-acesso");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error(
        "Erro no login:",
        error
      );

      setError(
        error.message ||
          "Erro ao realizar login."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">

        <div className="auth-logo">
          <img
            src={logoNexo}
            alt="Nexo Portal RH"
          />
        </div>

        <h1 className="auth-title">
          Bem-vindo(a)
        </h1>

        <p className="auth-subtitle">
          Acesse o Nexo e simplifique
          <br />
          a gestão de pessoas.
        </p>

        <form
          className="auth-form"
          onSubmit={handleLogin}
        >

          {/* CPF */}

          <div className="auth-field">

            <UserRound
              className="auth-field-icon"
              size={22}
              strokeWidth={2}
            />

            <input
              className="auth-input"
              type="text"
              placeholder="Digite seu CPF"
              value={cpf}
              onChange={(event) =>
                setCpf(event.target.value)
              }
              maxLength={14}
              autoComplete="username"
              required
            />

          </div>

          {/* Senha */}

          <div className="auth-field">

            <LockKeyhole
              className="auth-field-icon"
              size={22}
              strokeWidth={2}
            />

            <input
              className="auth-input"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Digite sua senha"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="auth-password-toggle"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
              aria-label={
                showPassword
                  ? "Ocultar senha"
                  : "Mostrar senha"
              }
            >
              {showPassword ? (
                <Eye size={21} />
              ) : (
                <EyeOff size={21} />
              )}
            </button>

          </div>

          {error && (
            <p className="auth-message auth-error">
              {error}
            </p>
          )}

          <button
            className="auth-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Entrando..."
              : "Entrar"}
          </button>

        </form>

        <footer className="auth-footer">

          <div className="auth-footer-line">
            <span>
              Nexo Portal RH
            </span>
          </div>

          <div className="auth-footer-text">
            Gestão de pessoas mais simples e eficiente!
          </div>

        </footer>

      </section>
    </main>
  );
}

export default Login;