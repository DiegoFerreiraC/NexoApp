import { useEffect, useState } from "react";
import { Mail, Phone, CalendarDays, BriefcaseBusiness } from "lucide-react";

import { supabase } from "../services/supabase";
import DashboardLayout from "../components/DashboardLayout";

import "../styles/myprofile.css";

function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(`${date}T12:00:00`)
  );
}

function MyProfile() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Não foi possível identificar o usuário.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("employee_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.employee_id) {
      setError("Não foi possível localizar o perfil do colaborador.");
      setLoading(false);
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select(
        `
          id,
          full_name,
          cpf,
          email,
          phone,
          birth_date,
          hire_date,
          salary,
          status,
          departments(name),
          positions(name)
        `
      )
      .eq("id", profile.employee_id)
      .single();

    if (employeeError) {
      console.error(employeeError);
      setError("Não foi possível carregar seus dados.");
      setLoading(false);
      return;
    }

    setEmployee(employeeData);
    setLoading(false);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <main className="my-profile-page">
          <div className="my-profile-container">
            <div className="my-profile-state">
              Carregando seu perfil...
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <main className="my-profile-page">
          <div className="my-profile-container">
            <div className="my-profile-state my-profile-error">
              {error}
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="my-profile-page">
        <div className="my-profile-container">
          <header className="my-profile-header">
            <div className="my-profile-avatar">
              {employee.full_name?.charAt(0).toUpperCase()}
            </div>

            <div>
              <p className="my-profile-kicker">
                Meu perfil
              </p>

              <h1>{employee.full_name}</h1>

              <p>
                Confira seus dados pessoais e profissionais.
              </p>
            </div>
          </header>

          <section className="my-profile-card">
            <div className="my-profile-section-header">
              <div>
                <h2>Dados pessoais</h2>
                <p>Informações de identificação e contato.</p>
              </div>
            </div>

            <div className="my-profile-grid">
              <div className="my-profile-field">
                <span>Nome completo</span>
                <strong>{employee.full_name}</strong>
              </div>

              <div className="my-profile-field">
                <span>CPF</span>
                <strong>{employee.cpf || "-"}</strong>
              </div>

              <div className="my-profile-field">
                <span>E-mail</span>
                <div className="my-profile-field-with-icon">
                  <Mail size={17} />
                  <strong>{employee.email || "-"}</strong>
                </div>
              </div>

              <div className="my-profile-field">
                <span>Telefone</span>
                <div className="my-profile-field-with-icon">
                  <Phone size={17} />
                  <strong>{employee.phone || "-"}</strong>
                </div>
              </div>

              <div className="my-profile-field">
                <span>Data de nascimento</span>
                <div className="my-profile-field-with-icon">
                  <CalendarDays size={17} />
                  <strong>
                    {formatDate(employee.birth_date)}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <section className="my-profile-card">
            <div className="my-profile-section-header">
              <div>
                <h2>Dados profissionais</h2>
                <p>Informações sobre seu vínculo com a empresa.</p>
              </div>
            </div>

            <div className="my-profile-grid">
              <div className="my-profile-field">
                <span>Data de admissão</span>
                <div className="my-profile-field-with-icon">
                  <CalendarDays size={17} />
                  <strong>
                    {formatDate(employee.hire_date)}
                  </strong>
                </div>
              </div>

              <div className="my-profile-field">
                <span>Departamento</span>
                <strong>
                  {employee.departments?.name || "-"}
                </strong>
              </div>

              <div className="my-profile-field">
                <span>Cargo</span>
                <div className="my-profile-field-with-icon">
                  <BriefcaseBusiness size={17} />
                  <strong>
                    {employee.positions?.name || "-"}
                  </strong>
                </div>
              </div>

              <div className="my-profile-field">
                <span>Status</span>
                <span className="my-profile-status">
                  {employee.status === "active"
                    ? "Ativo"
                    : "Inativo"}
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}

export default MyProfile;