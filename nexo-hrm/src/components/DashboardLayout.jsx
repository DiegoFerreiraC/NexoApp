import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Bell,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  UserPlus,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "../services/supabase";

import "../styles/dashboard.css";

const navigationItems = [
  {
    label: "Início",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    label: "Colaboradores",
    icon: UsersRound,
    path: "/colaboradores",
    adminOnly: true,
  },
  {
    label: "Admissões",
    icon: UserPlus,
    path: "/colaboradores/cadastro",
    adminOnly: true,
  },
  {
    label: "Férias",
    icon: CalendarDays,
    path: "/ferias",
  },
  {
    label: "Folha de pagamento",
    icon: WalletCards,
    path: "/folha",
  },
];

function DashboardLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState("");

  useEffect(() => {
    loadProfileRole();
  }, []);

  async function loadProfileRole() {
    setRoleLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setRoleLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, employee_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Erro ao carregar perfil:", profileError);
      setRoleLoading(false);
      return;
    }

    setRole(profile.role);

    if (profile.employee_id) {
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("full_name")
        .eq("id", profile.employee_id)
        .single();

      if (!employeeError && employee) {
        setEmployeeName(employee.full_name);
      }
    }

    setRoleLoading(false);
  }

  function isActive(path) {
    if (path === "/colaboradores") {
      return location.pathname.startsWith("/colaboradores");
    }

    return location.pathname === path;
  }

  function handleUnavailableAction(label) {
    setNotice(
      `${label}: este módulo será disponibilizado nas próximas etapas do MVP.`
    );

    setMenuOpen(false);
    setProfileMenuOpen(false);
  }

  function handleNavigation(item) {
    if (!item.path) {
      handleUnavailableAction(item.label);
      return;
    }

    navigate(item.path);
    setMenuOpen(false);
  }

  async function handleLogout() {
    setLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erro ao sair:", error);
      setLoading(false);
      return;
    }

    navigate("/", { replace: true });
  }

  const isAdminArea = role === "hr" || role === "admin";

  const visibleNavigationItems = navigationItems.filter((item) => {
    if (item.adminOnly) {
      return isAdminArea;
    }

    return true;
  });

  const profileInitial =
    employeeName?.trim()?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="dashboard-shell">
      <aside className={`dashboard-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="dashboard-brand">
          Nexo<span>RH</span>
        </div>

        <nav
          className="dashboard-navigation"
          aria-label="Navegação principal"
        >
          {!roleLoading &&
            visibleNavigationItems.map(
              ({ label, icon: Icon, path }) => (
                <button
                  className={`dashboard-nav-item ${isActive(path) ? "is-active" : ""
                    }`}
                  type="button"
                  key={label}
                  onClick={() =>
                    handleNavigation({ label, path })
                  }
                >
                  <Icon
                    size={18}
                    strokeWidth={
                      isActive(path) ? 2.4 : 2
                    }
                  />

                  <span>{label}</span>
                </button>
              )
            )}
        </nav>

        <button
          className="dashboard-nav-item dashboard-settings"
          type="button"
          onClick={() =>
            handleUnavailableAction("Configurações")
          }
        >
          <Settings size={18} />

          <span>Configurações</span>
        </button>
      </aside>

      {menuOpen && (
        <button
          className="dashboard-overlay"
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="dashboard-main">
        <header className="dashboard-header">
          <button
            className="dashboard-menu-button"
            type="button"
            aria-label={
              menuOpen ? "Fechar menu" : "Abrir menu"
            }
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>

          <label className="dashboard-search">
            <Search size={19} />

            <input
              type="search"
              placeholder="Buscar colaborador, documento..."
            />
          </label>

          <div className="dashboard-header-actions">
            <button
              className="dashboard-icon-button"
              type="button"
              aria-label="Notificações"
              onClick={() =>
                handleUnavailableAction("Notificações")
              }
            >
              <Bell size={23} />
            </button>

            <div className="dashboard-profile-menu">
              <button
                className="dashboard-avatar"
                type="button"
                aria-label="Abrir menu do perfil"
                aria-expanded={profileMenuOpen}
                onClick={() =>
                  setProfileMenuOpen(!profileMenuOpen)
                }
              >
                {roleLoading ? "..." : profileInitial}
              </button>

              {profileMenuOpen && (
                <div className="dashboard-profile-dropdown">
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/perfil");
                      setProfileMenuOpen(false);
                    }}
                  >
                    <UserRound size={18} />

                    Perfil
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loading}
                  >
                    <LogOut size={18} />

                    {loading
                      ? "Saindo..."
                      : "Sair da conta"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {notice && (
          <p
            className="dashboard-layout-notice"
            role="status"
          >
            {notice}

            <button
              type="button"
              onClick={() => setNotice("")}
            >
              Fechar
            </button>
          </p>
        )}

        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;