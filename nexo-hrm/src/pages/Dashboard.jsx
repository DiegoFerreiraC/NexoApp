import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

import {
  BarChart3,
  CalendarDays,
  FilePlus2,
  UserPlus,
} from "lucide-react";

import teamIllustration from "../assets/dashboard-team.png";

import DashboardLayout from "../components/DashboardLayout";

const quickActions = [
  {
    label: "Adicionar colaborador",
    icon: UserPlus,
  },
  {
    label: "Lançar férias",
    icon: CalendarDays,
  },
  {
    label: "Lançar documento",
    icon: FilePlus2,
  },
  {
    label: "Gerar relatório",
    icon: BarChart3,
  },
];

function Dashboard() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  function handleQuickAction(label) {
    if (label === "Adicionar colaborador") {
      navigate("/colaboradores/cadastro");
      return;
    }

    if (label === "Lançar férias") {
      navigate("/ferias");
      return;
    }

    setNotice(
      `${label}: este módulo será disponibilizado nas próximas etapas do MVP.`
    );
  }
  useEffect(() => {
    loadUserRole();
  }, []);

  async function loadUserRole() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setRoleLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Erro ao carregar perfil:", error);
      setRoleLoading(false);
      return;
    }

    setRole(data.role);
    setRoleLoading(false);
  }

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <section
          className="dashboard-hero"
          aria-labelledby="dashboard-welcome-title"
        >
          <div className="dashboard-hero-copy">
            <p className="dashboard-eyebrow">
              Portal administrativo
            </p>

            <p className="dashboard-greeting">
              Bem-vindo(a) de volta!
            </p>

            <h1 id="dashboard-welcome-title">
              Gestão de pessoas mais simples e eficiente.
            </h1>

            <p className="dashboard-hero-description">
              Centralize as rotinas do RH e acompanhe sua equipe em um só lugar.
            </p>
          </div>

          <img
            src={teamIllustration}
            alt="Equipe colaborando em atividades de RH"
          />
        </section>
        {!roleLoading && role !== "employee" && (

          <section
            className="quick-access"
            aria-labelledby="quick-access-title"
          >
            <div className="quick-access-heading">
              <div>
                <p className="section-kicker">
                  Atalhos
                </p>

                <h2 id="quick-access-title">
                  Acesso rápido
                </h2>
              </div>

              <span>Rotinas mais usadas</span>
            </div>

            <div className="quick-actions-grid">
              {quickActions.map(
                ({ label, icon: Icon }) => (
                  <button
                    className="quick-action"
                    type="button"
                    key={label}
                    onClick={() => handleQuickAction(label)}
                  >
                    <span className="quick-action-icon">
                      <Icon size={29} strokeWidth={1.9} />
                    </span>

                    <span>{label}</span>
                  </button>
                )
              )}
            </div>
          </section>
        )}
        {notice && (
          <p className="dashboard-notice" role="status">
            {notice}

            <button
              type="button"
              onClick={() => setNotice("")}
            >
              Fechar
            </button>
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
