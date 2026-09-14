import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "../services/supabase";

import "../styles/auth.css";

import logoNexo from "../assets/nexo-logo.png";

function FirstAccess() {
  const navigate = useNavigate();

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function handleChangePassword(
    event
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError(
        "A senha deve ter pelo menos 8 caracteres."
      );

      return;
    }

    if (!/[A-Za-z]/.test(newPassword)) {
      setError(
        "A senha deve conter pelo menos uma letra."
      );

      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError(
        "A senha deve conter pelo menos um número."
      );

      return;
    }

    if (
      newPassword !== confirmPassword
    ) {
      setError(
        "As senhas não coincidem."
      );

      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Sessão não encontrada. Faça login novamente."
        );
      }

      const {
        error: passwordError,
      } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError) {
        throw passwordError;
      }

      const {
        error: profileError,
      } = await supabase
        .from("profiles")
        .update({
          must_change_password: false,
          last_password_change:
            new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      setSuccess(
        "Senha alterada com sucesso! Redirecionando..."
      );

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);

    } catch (error) {
      console.error(
        "Erro ao alterar senha:",
        error
      );

      setError(
        error.message ||
          "Não foi possível alterar a senha."
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
          Primeiro acesso
        </h1>

        <p className="auth-subtitle">
          Para continuar, você precisa
          <br />
          criar uma nova senha.
        </p>

        <form
          className="auth-form"
          onSubmit={handleChangePassword}
        >

          {/* Nova senha */}

          <div className="auth-field">

            <LockKeyhole
              className="auth-field-icon"
              size={22}
            />

            <input
              className="auth-input"
              type={
                showNewPassword
                  ? "text"
                  : "password"
              }
              placeholder="Digite sua nova senha"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value
                )
              }
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              className="auth-password-toggle"
              onClick={() =>
                setShowNewPassword(
                  !showNewPassword
                )
              }
            >
              {showNewPassword ? (
                <Eye size={21} />
              ) : (
                <EyeOff size={21} />
              )}
            </button>

          </div>

          {/* Confirmar senha */}

          <div className="auth-field">

            <LockKeyhole
              className="auth-field-icon"
              size={22}
            />

            <input
              className="auth-input"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              placeholder="Confirme sua nova senha"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              className="auth-password-toggle"
              onClick={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
            >
              {showConfirmPassword ? (
                <Eye size={21} />
              ) : (
                <EyeOff size={21} />
              )}
            </button>

          </div>

          {/* Requisitos */}

          <div className="password-requirements">

            <div className="password-requirements-header">

              <ShieldCheck
                className="password-requirements-icon"
                size={23}
              />

              <strong>
                Sua senha deve conter:
              </strong>

            </div>

            <ul>
              <li>
                Pelo menos 8 caracteres
              </li>

              <li>
                Ao menos uma letra
              </li>

              <li>
                Ao menos um número
              </li>
            </ul>

          </div>

          {error && (
            <p className="auth-message auth-error">
              {error}
            </p>
          )}

          {success && (
            <p className="auth-message auth-success">
              {success}
            </p>
          )}

          <button
            className="auth-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Alterando senha..."
              : "Criar nova senha"}
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

export default FirstAccess;