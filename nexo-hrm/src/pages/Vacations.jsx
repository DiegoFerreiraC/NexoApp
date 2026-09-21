import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Search,
  X,
} from "lucide-react";
import { supabase } from "../services/supabase";
import DashboardLayout from "../components/DashboardLayout";
import "../styles/vacations.css";

const STATUS_LABELS = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Reprovada",
};

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovadas" },
  { value: "rejected", label: "Reprovadas" },
];

function formatDate(dateString) {
  if (!dateString) return "-";

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function formatPeriod(startDate, endDate) {
  return `${formatDate(startDate)} a ${formatDate(endDate)}`;
}

function calculateDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  const difference = end.getTime() - start.getTime();

  if (difference < 0) return 0;

  return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;
}

function Vacations() {
  const [role, setRole] = useState("");
  const [profile, setProfile] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      setInitialLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setInitialLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, employee_id, role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
        setInitialLoading(false);
        return;
      }

      setProfile(data);
      setRole(data?.role || "");
      setInitialLoading(false);
    }

    loadProfile();
  }, []);

  if (initialLoading) {
    return (
      <DashboardLayout>
        <main className="vacation-page">
          <div className="vacation-container">
            <div className="vacation-state">
              <div className="vacation-spinner" />
              <p>Carregando...</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (role === "employee") {
    return (
      <EmployeeVacations
        employeeId={profile?.employee_id}
      />
    );
  }

  return <ManagerVacations />;
}

/* =========================================================
   ÁREA DO COLABORADOR
========================================================= */

function EmployeeVacations({ employeeId }) {
  const [requests, setRequests] = useState([]);
  const [employee, setEmployee] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelLoading, setCancelLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const days = useMemo(
    () => calculateDays(startDate, endDate),
    [startDate, endDate]
  );

  async function loadEmployeeData() {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const [employeeResult, requestsResult] = await Promise.all([
      supabase
        .from("employees")
        .select("id, full_name, email")
        .eq("id", employeeId)
        .single(),

      supabase
        .from("vacation_requests")
        .select(`
          id,
          start_date,
          end_date,
          days,
          reason,
          status,
          created_at
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false }),
    ]);

    if (employeeResult.error) {
      console.error(employeeResult.error);
      setError("Não foi possível carregar seus dados.");
    } else {
      setEmployee(employeeResult.data);
    }

    if (requestsResult.error) {
      console.error(requestsResult.error);
      setError("Não foi possível carregar suas solicitações.");
    } else {
      setRequests(requestsResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadEmployeeData();
  }, [employeeId]);

  function resetForm() {
    setStartDate("");
    setEndDate("");
    setReason("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!employeeId) {
      setError("Não foi possível identificar seu cadastro.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Informe a data de início e a data de término.");
      return;
    }

    if (days <= 0) {
      setError(
        "A data de término deve ser igual ou posterior à data de início."
      );
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase
      .from("vacation_requests")
      .insert({
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        days,
        reason: reason.trim() || null,
        status: "pending",
      });

    if (insertError) {
      console.error(insertError);
      setError(
        "Não foi possível enviar sua solicitação. Tente novamente."
      );
      setSubmitting(false);
      return;
    }

    setSuccess("Solicitação de férias enviada com sucesso.");

    resetForm();
    await loadEmployeeData();

    setSubmitting(false);
  }

  async function handleCancel(request) {
    if (cancelLoading) return;

    const confirmed = window.confirm(
      "Deseja cancelar esta solicitação de férias?"
    );

    if (!confirmed) return;

    setCancelLoading(request.id);
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("vacation_requests")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id)
      .eq("status", "pending");

    if (updateError) {
      console.error(updateError);
      setError("Não foi possível cancelar a solicitação.");
      setCancelLoading("");
      return;
    }

    setSuccess("Solicitação cancelada com sucesso.");

    await loadEmployeeData();
    setCancelLoading("");
  }

  return (
    <DashboardLayout>
      <main className="vacation-page">
        <div className="vacation-container">
          <header className="vacation-header">
            <div>
              <p className="vacation-eyebrow">Minhas férias</p>

              <h1>Solicitação de férias</h1>

              <p>
                Solicite suas férias e acompanhe o status das
                solicitações enviadas.
              </p>
            </div>
          </header>

          {error && (
            <div className="vacation-message vacation-message-error">
              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Fechar mensagem"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {success && (
            <div className="vacation-message vacation-message-success">
              <span>{success}</span>

              <button
                type="button"
                onClick={() => setSuccess("")}
                aria-label="Fechar mensagem"
              >
                <X size={17} />
              </button>
            </div>
          )}

          <section className="vacation-request-card">
            <div className="vacation-section-heading">
              <div className="vacation-section-icon">
                <CalendarDays size={21} />
              </div>

              <div>
                <h2>Nova solicitação</h2>
                <p>
                  Informe o período em que deseja tirar suas férias.
                </p>
              </div>
            </div>

            <form
              className="vacation-request-form"
              onSubmit={handleSubmit}
            >
              <div className="vacation-form-grid">
                <label className="vacation-field">
                  <span>Data de início</span>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) =>
                      setStartDate(event.target.value)
                    }
                  />
                </label>

                <label className="vacation-field">
                  <span>Data de término</span>

                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) =>
                      setEndDate(event.target.value)
                    }
                  />
                </label>

                <div className="vacation-days-preview">
                  <span>Quantidade de dias</span>

                  <strong>
                    {days > 0 ? days : "—"}
                  </strong>

                  {days > 0 && (
                    <small>
                      {days === 1 ? "dia" : "dias"}
                    </small>
                  )}
                </div>
              </div>

              <label className="vacation-field">
                <span>Motivo ou observação</span>

                <textarea
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  placeholder="Descreva uma observação, se necessário..."
                  rows={4}
                  maxLength={500}
                />

                <small>{reason.length}/500</small>
              </label>

              <div className="vacation-form-footer">
                <p>
                  Sua solicitação será enviada para análise do RH.
                </p>

                <button
                  type="submit"
                  className="vacation-submit-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Enviando..."
                    : "Solicitar férias"}
                </button>
              </div>
            </form>
          </section>

          <section className="vacation-my-requests">
            <div className="vacation-section-title">
              <div>
                <p className="vacation-eyebrow">Histórico</p>
                <h2>Minhas solicitações</h2>
              </div>

              {employee?.full_name && (
                <span>{employee.full_name}</span>
              )}
            </div>

            {loading ? (
              <div className="vacation-state">
                <div className="vacation-spinner" />
                <p>Carregando solicitações...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="vacation-state vacation-state-small">
                <div className="vacation-empty-icon">
                  <CalendarEmptyIcon />
                </div>

                <h2>Nenhuma solicitação ainda</h2>

                <p>
                  Suas solicitações de férias aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="employee-vacation-list">
                {requests.map((request) => (
                  <article
                    className="employee-vacation-item"
                    key={request.id}
                  >
                    <div className="employee-vacation-period">
                      <div className="employee-vacation-calendar">
                        <CalendarDays size={19} />
                      </div>

                      <div>
                        <strong>
                          {formatPeriod(
                            request.start_date,
                            request.end_date
                          )}
                        </strong>

                        <span>
                          {request.days}{" "}
                          {request.days === 1 ? "dia" : "dias"}
                        </span>
                      </div>
                    </div>

                    <div className="employee-vacation-reason">
                      <span>Observação</span>
                      <p>
                        {request.reason || "Não informado"}
                      </p>
                    </div>

                    <div className="employee-vacation-status">
                      <span
                        className={`vacation-status vacation-status-${request.status}`}
                      >
                        {STATUS_LABELS[request.status] ||
                          request.status}
                      </span>

                      {request.status === "pending" && (
                        <button
                          type="button"
                          className="employee-cancel-button"
                          disabled={cancelLoading === request.id}
                          onClick={() => handleCancel(request)}
                        >
                          {cancelLoading === request.id
                            ? "Cancelando..."
                            : "Cancelar"}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}



function ManagerVacations() {
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadRequests() {
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("vacation_requests")
      .select(`
        id,
        employee_id,
        start_date,
        end_date,
        days,
        reason,
        status,
        approved_by,
        created_at,
        employees (
          full_name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error(queryError);
      setError(
        "Não foi possível carregar as solicitações de férias."
      );
      setRequests([]);
      setLoading(false);
      return;
    }

    setRequests(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return requests.filter((request) => {
      const employeeName =
        request.employees?.full_name?.toLowerCase() || "";

      const matchesSearch =
        !normalizedSearch ||
        employeeName.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const pendingCount = useMemo(
    () =>
      requests.filter(
        (request) => request.status === "pending"
      ).length,
    [requests]
  );

  async function handleStatusChange(request, newStatus) {
    if (actionLoading) return;

    const actionText =
      newStatus === "approved" ? "aprovar" : "reprovar";

    const confirmed = window.confirm(
      `Deseja ${actionText} a solicitação de ${
        request.employees?.full_name || "este colaborador"
      }?`
    );

    if (!confirmed) return;

    setActionLoading(request.id);
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sua sessão expirou. Faça login novamente.");
      setActionLoading("");
      return;
    }

    const { error: updateError } = await supabase
      .from("vacation_requests")
      .update({
        status: newStatus,
        approved_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (updateError) {
      console.error(updateError);
      setError(
        `Não foi possível ${actionText} a solicitação.`
      );
      setActionLoading("");
      return;
    }

    setSuccess(
      `Solicitação de ${
        request.employees?.full_name || "colaborador"
      } ${
        newStatus === "approved" ? "aprovada" : "reprovada"
      } com sucesso.`
    );

    await loadRequests();
    setActionLoading("");
  }

  return (
    <DashboardLayout>
    <main className="vacation-page">
      <div className="vacation-container">
        <header className="vacation-header">
          <div>
            <p className="vacation-eyebrow">Gestão de pessoas</p>

            <h1>Gestão de férias</h1>

            <p>
              Consulte e gerencie as solicitações de férias dos
              colaboradores.
            </p>
          </div>

          <div className="vacation-pending-card">
            <span className="vacation-pending-icon">
              <Clock size={21} strokeWidth={2} />
            </span>

            <div>
              <strong>{pendingCount}</strong>
              <span>
                pendente{pendingCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </header>

        {error && (
          <div className="vacation-message vacation-message-error">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Fechar mensagem"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="vacation-message vacation-message-success">
            <span>{success}</span>

            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Fechar mensagem"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="vacation-card">
          <div className="vacation-toolbar">
            <div className="vacation-search">
              <Search size={18} strokeWidth={1.9} />

              <input
                type="search"
                placeholder="Buscar colaborador..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <div className="vacation-filter">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="Filtrar por status"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <ChevronDown size={17} strokeWidth={1.9} />
            </div>
          </div>

          <div className="vacation-table-header">
            <span>Colaborador</span>
            <span>Período</span>
            <span>Dias</span>
            <span>Motivo</span>
            <span>Status</span>
            <span>Ações</span>
          </div>

          {loading ? (
            <div className="vacation-state">
              <div className="vacation-spinner" />
              <p>Carregando solicitações...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="vacation-state">
              <div className="vacation-empty-icon">
                <CalendarEmptyIcon />
              </div>

              <h2>
                {requests.length === 0
                  ? "Nenhuma solicitação encontrada"
                  : "Nenhum resultado encontrado"}
              </h2>

              <p>
                {requests.length === 0
                  ? "As solicitações de férias aparecerão aqui."
                  : "Tente alterar a busca ou o filtro de status."}
              </p>
            </div>
          ) : (
            <div className="vacation-list">
              {filteredRequests.map((request) => {
                const employeeName =
                  request.employees?.full_name ||
                  "Colaborador não identificado";

                const employeeEmail =
                  request.employees?.email || "";

                const isPending = request.status === "pending";
                const isLoading = actionLoading === request.id;

                return (
                  <article
                    className="vacation-row"
                    key={request.id}
                  >
                    <div className="vacation-employee">
                      <div className="vacation-avatar">
                        {employeeName.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <strong>{employeeName}</strong>
                        <span>{employeeEmail}</span>
                      </div>
                    </div>

                    <div className="vacation-period">
                      {formatPeriod(
                        request.start_date,
                        request.end_date
                      )}
                    </div>

                    <div className="vacation-days">
                      {request.days}{" "}
                      {request.days === 1 ? "dia" : "dias"}
                    </div>

                    <div className="vacation-reason">
                      {request.reason || "Não informado"}
                    </div>

                    <div>
                      <span
                        className={`vacation-status vacation-status-${request.status}`}
                      >
                        {STATUS_LABELS[request.status] ||
                          request.status}
                      </span>
                    </div>

                    <div className="vacation-actions">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            className="vacation-action vacation-action-approve"
                            onClick={() =>
                              handleStatusChange(
                                request,
                                "approved"
                              )
                            }
                            disabled={isLoading}
                          >
                            <Check size={17} />
                            <span>
                              {isLoading ? "..." : "Aprovar"}
                            </span>
                          </button>

                          <button
                            type="button"
                            className="vacation-action vacation-action-reject"
                            onClick={() =>
                              handleStatusChange(
                                request,
                                "rejected"
                              )
                            }
                            disabled={isLoading}
                          >
                            <X size={17} />
                            <span>
                              {isLoading ? "..." : "Reprovar"}
                            </span>
                          </button>
                        </>
                      ) : (
                        <span className="vacation-no-action">
                          Finalizada
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
    </DashboardLayout>
  );
}

function CalendarEmptyIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M16 2v4M8 2v4M3 9h18" />
      <path d="M8 13h3M8 17h5" />
    </svg>
  );
}

export default Vacations;