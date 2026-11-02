import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Bell,
  CalendarDays,
  Clock,
  Clock3,
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
  ClipboardCheck,
  CheckCheck,
  BellRing,
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
  {
    label: "Espelho de ponto",
    icon: Clock,
    path: "/ponto",
  },
  {
    label: "Gestão de ponto",
    icon: Clock3,
    path: "/gestao-ponto",
    adminOnly: true,
  },
  {
    label: "Avaliação dos colaboradores",
    icon: ClipboardCheck,
    path: "/avaliacoes",
    adminOnly: true,
  },
];

function formatNotificationDate(date) {
  if (!date) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function DashboardLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState("");


  useEffect(() => {
    let channel = null;
    let active = true;

    async function initializeLayout() {
      setRoleLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        setRoleLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, employee_id")
        .eq("id", user.id)
        .single();

      if (!active) return;

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

        if (!active) return;

        if (!employeeError && employee) {
          setEmployeeName(employee.full_name);
        }
      }

      // Libera a interface sem esperar pelas notificações.
      setRoleLoading(false);

      async function loadNotifications() {
        if (active) {
          setNotificationLoading(true);
        }

        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);

        if (!active) return;

        if (error) {
          console.error("Erro ao carregar notificações:", error);
        } else {
          setNotifications(data || []);
        }

        setNotificationLoading(false);
      }

      // Carrega notificações independentemente do menu.
      loadNotifications();

      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            console.error(
              "Erro na inscrição de notificações em tempo real."
            );
          }
        });
    }

    initializeLayout();

    return () => {
      active = false;

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);


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
    setNotificationOpen(false);
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

  async function markNotificationAsRead(notification) {
    if (notification.is_read) return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: now,
      })
      .eq("id", notification.id);

    if (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, is_read: true, read_at: now }
          : item
      )
    );
  }

  async function markAllNotificationsAsRead() {
    const unreadIds = notifications
      .filter((item) => !item.is_read)
      .map((item) => item.id);

    if (unreadIds.length === 0) return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: now,
      })
      .in("id", unreadIds);

    if (error) {
      console.error("Erro ao marcar notificações como lidas:", error);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        unreadIds.includes(item.id)
          ? { ...item, is_read: true, read_at: now }
          : item
      )
    );
  }

  async function handleNotificationClick(notification) {
    await markNotificationAsRead(notification);

    setNotificationOpen(false);

    let destination = "/dashboard";

    if (notification.related_table === "vacation_requests") {
      destination = "/ferias";
    }

    if (notification.related_table === "time_adjustment_requests") {
      destination =
        role === "hr" || role === "admin"
          ? "/gestao-ponto"
          : "/ponto";
    }

    navigate(destination);
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

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

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
            visibleNavigationItems.map(({ label, icon: Icon, path }) => (
              <button
                className={`dashboard-nav-item ${isActive(path) ? "is-active" : ""
                  }`}
                type="button"
                key={label}
                onClick={() => handleNavigation({ label, path })}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive(path) ? 2.4 : 2}
                />

                <span>{label}</span>
              </button>
            ))}
        </nav>

        <button
          className="dashboard-nav-item dashboard-settings"
          type="button"
          onClick={() => handleUnavailableAction("Configurações")}
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
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
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
            <div className="dashboard-notification-menu">
              <button
                className={`dashboard-icon-button ${notificationOpen ? "is-open" : ""
                  }`}
                type="button"
                aria-label={`Notificações, ${unreadCount} não lidas`}
                aria-expanded={notificationOpen}
                onClick={() => {
                  setNotificationOpen(!notificationOpen);
                  setProfileMenuOpen(false);
                }}
              >
                <Bell size={23} />

                {unreadCount > 0 && (
                  <span className="dashboard-notification-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="dashboard-notification-dropdown">
                  <div className="dashboard-notification-header">
                    <div>
                      <h3>Notificações</h3>
                      <span>
                        {unreadCount === 0
                          ? "Tudo em dia"
                          : `${unreadCount} não lida(s)`}
                      </span>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsAsRead}
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>

                  <div className="dashboard-notification-list">
                    {notificationLoading && notifications.length === 0 ? (
                      <div className="dashboard-notification-empty">
                        Carregando notificações...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="dashboard-notification-empty">
                        <BellRing size={25} />
                        <strong>Nenhuma notificação</strong>
                        <span>
                          Quando houver novidades, elas aparecerão aqui.
                        </span>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          className={`dashboard-notification-item ${notification.is_read ? "is-read" : "is-unread"
                            }`}
                          onClick={() =>
                            handleNotificationClick(notification)
                          }
                        >
                          <span className="dashboard-notification-indicator" />

                          <span className="dashboard-notification-content">
                            <strong>{notification.title}</strong>
                            <span>{notification.message}</span>
                            <small>
                              {formatNotificationDate(
                                notification.created_at
                              )}
                            </small>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="dashboard-profile-menu">
              <button
                className="dashboard-avatar"
                type="button"
                aria-label="Abrir menu do perfil"
                aria-expanded={profileMenuOpen}
                onClick={() => {
                  setProfileMenuOpen(!profileMenuOpen);
                  setNotificationOpen(false);
                }}
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
                    {loading ? "Saindo..." : "Sair da conta"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {notice && (
          <p className="dashboard-layout-notice" role="status">
            {notice}

            <button type="button" onClick={() => setNotice("")}>
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