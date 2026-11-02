import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Paperclip,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "../services/supabase";
import "../styles/time-clock-management.css";

import CommandBus from "../commands/CommandBus";
import ReviewTimeAdjustmentCommand from "../commands/ReviewTimeAdjustmentCommand";

const REQUEST_TYPES = {
  missing_punch: "Esquecimento / falta de batida",
  incorrect_time: "Horário registrado incorretamente",
  power_outage: "Queda de energia",
  equipment_failure: "Problema no relógio ou equipamento",
  medical_certificate: "Atestado médico",
  justified_absence: "Ausência justificada",
  other: "Outro motivo",
};

const PUNCH_TYPE_LABELS = {
  entry: "Entrada",
  lunch_start: "Saída para intervalo",
  lunch_end: "Retorno do intervalo",
  exit: "Saída",
};

const PUNCH_TIME_FIELDS = [
  ["requested_entry_time", "Entrada"],
  ["requested_lunch_start_time", "Saída para intervalo"],
  ["requested_lunch_end_time", "Retorno do intervalo"],
  ["requested_exit_time", "Saída"],
];

const pad = (n) => String(n).padStart(2, "0");
const currentMonthString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const nextMonth = (value) => {
  const [year, month] = value.split("-").map(Number);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};
const dateLabel = (value) => {
  if (!value) return "—";
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
};
const weekdayLabel = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(new Date(year, month - 1, day));
};
const formatDuration = (minutes) => {
  const abs = Math.abs(Math.round(minutes || 0));
  return `${minutes < 0 ? "-" : ""}${Math.floor(abs / 60)}h${pad(abs % 60)}`;
};
const punchTime = (value) => String(value || "").slice(11, 16);
const clockFromSqlTime = (value) => {
  if (!value) return "";
  const text = String(value);
  return text.includes("T") || text.includes(" ") ? text.slice(11, 16) : text.slice(0, 5);
};

function isWeekendOrHoliday(date, holidaysByDate) {
  if (holidaysByDate[date]) return "holiday";
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  if (weekday === 0) return "rest";
  if (weekday === 6) return "saturday";
  return "weekday";
}

function scheduledMinutes(date, holidaysByDate) {
  const type = isWeekendOrHoliday(date, holidaysByDate);
  if (type === "holiday" || type === "rest") return 0;
  return type === "saturday" ? 240 : 480;
}

function calculateWorkedMinutes(punches, type) {
  const sorted = [...punches].sort((a, b) =>
    String(a.punched_at).localeCompare(String(b.punched_at)),
  );

  const byType = Object.fromEntries(
    sorted.filter((p) => p.punch_type).map((p) => [p.punch_type, p]),
  );

  if (type === "saturday") {
    const entry = byType.entry;
    const exit = byType.exit;
    if (entry && exit) {
      const diff = new Date(`2000-01-01T${punchTime(exit)}:00`) - new Date(`2000-01-01T${punchTime(entry)}:00`);
      return Math.max(0, Math.round(diff / 60000));
    }
  } else if (byType.entry || byType.lunch_start || byType.lunch_end || byType.exit) {
    let sum = 0;
    const pairs = [
      [byType.entry, byType.lunch_start],
      [byType.lunch_end, byType.exit],
    ];
    pairs.forEach(([start, end]) => {
      if (start && end) {
        const a = new Date(`2000-01-01T${punchTime(start)}:00`);
        const b = new Date(`2000-01-01T${punchTime(end)}:00`);
        const diff = Math.round((b - a) / 60000);
        if (diff > 0) sum += diff;
      }
    });
    return sum;
  }

  // Fallback for old records that do not yet have punch_type.
  let total = 0;
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    const a = new Date(`2000-01-01T${punchTime(sorted[i])}:00`);
    const b = new Date(`2000-01-01T${punchTime(sorted[i + 1])}:00`);
    const diff = Math.round((b - a) / 60000);
    if (diff > 0) total += diff;
  }
  return total;
}

function RequestedTimes({ request }) {
  const requested = PUNCH_TIME_FIELDS.filter(([field]) => request[field]);
  if (!requested.length && request.requested_punch_time) {
    const legacyLabel = PUNCH_TYPE_LABELS[request.punch_type] || "Horário solicitado";
    return <span className="tm-time-tag"><small>{legacyLabel}</small><strong>{clockFromSqlTime(request.requested_punch_time)}</strong></span>;
  }
  if (!requested.length) {
    return <span className="tm-no-time">Solicitação sem alteração de horário</span>;
  }
  return (
    <div className="tm-requested-times">
      {requested.map(([field, label]) => (
        <span className="tm-time-tag" key={field}>
          <small>{label}</small>
          <strong>{clockFromSqlTime(request[field])}</strong>
        </span>
      ))}
    </div>
  );
}

function DayStatus({ status }) {
  const labels = {
    future: "Futuro",
    holiday: "Feriado",
    rest: "Repouso",
    missing: "Sem batidas",
    incomplete: "Incompleto",
    review: "Conferir",
    complete: "Completo",
  };
  return <span className={`tm-status tm-status--${status}`}>{labels[status] || status}</span>;
}

export default function TimeClockManagement() {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [monthValue, setMonthValue] = useState(currentMonthString());
  const [punches, setPunches] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [reviewNotes, setReviewNotes] = useState({});
  const [holidayForm, setHolidayForm] = useState({ date: "", name: "", description: "" });
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingPunches, setLoadingPunches] = useState(false);
  const [workingRequestId, setWorkingRequestId] = useState("");
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [openingAttachmentId, setOpeningAttachmentId] = useState("");

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const currentMonth = currentMonthString();
  const today = todayString();

  const loadAdminData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoadingBase(true);
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Sua sessão expirou. Entre novamente no Nexo RH.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, employee_id, role")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;
      if (!["hr", "admin"].includes(profile?.role)) {
        throw new Error("Você não tem permissão para acessar a gestão de ponto.");
      }

      setUserId(authData.user.id);
      setRole(profile.role);

      const [employeesResult, requestsResult] = await Promise.all([
        supabase.from("employees")
          .select("id, full_name, cpf, email, status, departments(name), positions(name)")
          .order("full_name", { ascending: true }),
        supabase.from("time_adjustment_requests")
          .select("id, employee_id, punch_date, request_type, punch_type, requested_punch_time, requested_entry_time, requested_lunch_start_time, requested_lunch_end_time, requested_exit_time, description, attachment_path, status, created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(200),
      ]);

      if (employeesResult.error) throw employeesResult.error;
      if (requestsResult.error) throw requestsResult.error;

      const employeeRows = employeesResult.data || [];
      setEmployees(employeeRows);
      setPendingRequests((requestsResult.data || []).map((request) => ({
        ...request,
        employee: employeeRows.find((employee) => employee.id === request.employee_id) || null,
      })));

      setSelectedEmployeeId((currentId) => {
        if (!currentId || !employeeRows.some((employee) => employee.id === currentId)) {
          return employeeRows[0]?.id || "";
        }
        return currentId;
      });
    } catch (loadError) {
      console.error("Erro ao carregar gestão de ponto:", loadError);
      setError(loadError.message || "Não foi possível carregar a gestão de ponto.");
    } finally {
      setLoadingBase(false);
      setRefreshing(false);
    }
  }, []);

  const loadSelectedMonth = useCallback(async () => {
    if (!selectedEmployeeId || !["hr", "admin"].includes(role)) {
      setPunches([]);
      setHolidays([]);
      return;
    }
    setLoadingPunches(true);

    try {
      const start = `${monthValue}-01`;
      const end = nextMonth(monthValue);
      const [punchResult, holidayResult] = await Promise.all([
        supabase.from("time_punches")
          .select("id, employee_id, punched_at, punch_type, punch_source, is_active, note")
          .eq("employee_id", selectedEmployeeId)
          .eq("is_active", true)
          .gte("punched_at", `${start} 00:00:00`)
          .lt("punched_at", `${end} 00:00:00`)
          .order("punched_at", { ascending: true }),
        supabase.from("time_holidays")
          .select("id, holiday_date, name, description, is_active")
          .eq("is_active", true)
          .gte("holiday_date", start)
          .lt("holiday_date", end)
          .order("holiday_date", { ascending: true }),
      ]);

      if (punchResult.error) throw punchResult.error;
      if (holidayResult.error) throw holidayResult.error;

      setPunches(punchResult.data || []);
      setHolidays(holidayResult.data || []);
    } catch (loadError) {
      console.error("Erro ao carregar espelho do colaborador:", loadError);
      setError(loadError.message || "Não foi possível carregar o espelho deste colaborador.");
    } finally {
      setLoadingPunches(false);
    }
  }, [selectedEmployeeId, monthValue, role]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    loadSelectedMonth();
  }, [loadSelectedMonth]);

  const holidaysByDate = useMemo(
    () => Object.fromEntries(holidays.map((holiday) => [holiday.holiday_date, holiday])),
    [holidays],
  );

  const punchesByDate = useMemo(() => {
    const grouped = {};
    punches.forEach((punch) => {
      const date = String(punch.punched_at).slice(0, 10);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(punch);
    });
    Object.values(grouped).forEach((rows) =>
      rows.sort((a, b) => String(a.punched_at).localeCompare(String(b.punched_at))),
    );
    return grouped;
  }, [punches]);

  const days = useMemo(() => {
    const [year, month] = monthValue.split("-").map(Number);
    const nDays = new Date(year, month, 0).getDate();
    return Array.from({ length: nDays }, (_, index) => {
      const date = `${year}-${pad(month)}-${pad(index + 1)}`;
      const list = punchesByDate[date] || [];
      const type = isWeekendOrHoliday(date, holidaysByDate);
      const scheduled = scheduledMinutes(date, holidaysByDate);
      const worked = calculateWorkedMinutes(list, type);
      const future = date > today;
      let status = "complete";
      if (type === "holiday") status = "holiday";
      else if (type === "rest") status = "rest";
      else if (future) status = "future";
      else if (!list.length) status = "missing";
      else if (type === "saturday" ? list.length < 2 : list.length < 4) status = "incomplete";
      else if (type === "saturday" ? list.length > 2 : list.length > 4) status = "review";
      else if (list.some((p) => !p.punch_type)) status = "review";

      const included = monthValue < currentMonth || (monthValue === currentMonth && date <= today);
      return {
        date, list, type, scheduled, worked, status, included,
        balance: future || type === "holiday" || type === "rest" ? null : worked - scheduled,
      };
    });
  }, [monthValue, punchesByDate, holidaysByDate, today, currentMonth]);

  const summary = useMemo(() => {
    const includedDays = days.filter((day) => day.included);
    const expected = includedDays.reduce((sum, day) => sum + day.scheduled, 0);
    const worked = includedDays.reduce((sum, day) => sum + day.worked, 0);
    const balance = worked - expected;
    return {
      expected,
      worked,
      balance,
      period: monthValue < currentMonth ? "Mês completo" : monthValue === currentMonth ? `Até ${dateLabel(today)}` : "Período futuro",
    };
  }, [days, monthValue, currentMonth, today]);

  async function refreshAll() {
    await loadAdminData(true);
    await loadSelectedMonth();
  }
  async function viewAttachment(request) {
    if (!request.attachment_path) {
      setError("Esta solicitação não possui comprovante anexado.");
      return;
    }

    setError("");
    setOpeningAttachmentId(request.id);

    try {
      const { data, error: storageError } = await supabase.storage
        .from("time-adjustment-attachments")
        .createSignedUrl(request.attachment_path, 300);

      if (storageError) throw storageError;

      if (!data?.signedUrl) {
        throw new Error("Não foi possível gerar o link do comprovante.");
      }

      const path = request.attachment_path.toLowerCase();

      const isImage =
        path.endsWith(".jpg") ||
        path.endsWith(".jpeg") ||
        path.endsWith(".png");

      setAttachmentPreview({
        url: data.signedUrl,
        type: isImage ? "image" : "pdf",
        name: path.split("/").pop() || "Comprovante",
      });
    } catch (attachmentError) {
      console.error("Erro ao abrir comprovante:", attachmentError);
      setError(
        attachmentError.message ||
        "Não foi possível visualizar o comprovante."
      );
    } finally {
      setOpeningAttachmentId("");
    }
  }
  async function reviewRequest(request, decision) {
    setError("");
    setSuccess("");

    const note = (reviewNotes[request.id] || "").trim();

    if (decision === "rejected" && !note) {
      setError("Informe o motivo da reprovação antes de concluir a análise.");
      return;
    }

    setWorkingRequestId(request.id);

    try {
      // Cria o Command com os dados da solicitação
      const command = new ReviewTimeAdjustmentCommand(
        supabase,
        request.id,
        decision,
        note || null
      );

      // Executa o Command
      const { error: reviewError } = await CommandBus.execute(command);

      if (reviewError) {
        throw reviewError;
      }

      setSuccess(
        decision === "approved"
          ? "Solicitação aprovada e espelho de ponto atualizado."
          : "Solicitação reprovada."
      );

      if (decision === "approved") {
        setSelectedEmployeeId(request.employee_id);
        setMonthValue(String(request.punch_date).slice(0, 7));
      }

      setReviewNotes((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });

      await loadAdminData(true);

    } catch (error) {
      console.error("Erro ao revisar solicitação:", error);
      setError(error.message || "Não foi possível salvar a decisão.");

    } finally {
      setWorkingRequestId("");
    }
  }

  async function deactivateHoliday(holiday) {
    setError("");
    setSuccess("");
    const { error: updateError } = await supabase
      .from("time_holidays")
      .update({ is_active: false })
      .eq("id", holiday.id);

    if (updateError) {
      setError(updateError.message || "Não foi possível remover o feriado.");
      return;
    }

    setSuccess("Feriado removido do calendário ativo.");
    await loadSelectedMonth();
  }

  if (!loadingBase && !role) {
    return (
      <DashboardLayout>
        <main className="tm-page">
          <header className="tm-page-header">
            <div>
              <div className="tm-eyebrow"><ShieldCheck size={15} /> ADMINISTRAÇÃO DE JORNADA</div>
              <h1>Gestão de ponto</h1>
            </div>
          </header>
          <div className="tm-alert tm-alert--error"><AlertCircle size={18} /><span>{error || "Você não tem permissão para acessar a gestão de ponto."}</span></div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="tm-page">
        <header className="tm-page-header">
          <div>
            <div className="tm-eyebrow"><ShieldCheck size={15} /> ADMINISTRAÇÃO DE JORNADA</div>
            <h1>Gestão de ponto</h1>
            <p>Analise solicitações, consulte os espelhos e gerencie os feriados.</p>
          </div>
          <button className="tm-refresh-button" type="button" disabled={refreshing || loadingBase} onClick={refreshAll}>
            <RefreshCw size={16} className={refreshing ? "tm-spin" : ""} /> Atualizar
          </button>
        </header>

        {error && <div className="tm-alert tm-alert--error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
        {success && <div className="tm-alert tm-alert--success" role="status"><CheckCircle2 size={18} /><span>{success}</span><button type="button" onClick={() => setSuccess("")} aria-label="Fechar"><XCircle size={16} /></button></div>}

        <section className="tm-section">
          <div className="tm-section-header">
            <div>
              <h2>Solicitações de ajuste pendentes</h2>
              <p>Revise os horários informados e registre a decisão para cada pedido.</p>
            </div>
            <span className="tm-count-pill">{pendingRequests.length} pendente{pendingRequests.length === 1 ? "" : "s"}</span>
          </div>

          {loadingBase ? (
            <div className="tm-empty"><RefreshCw size={21} className="tm-spin" />Carregando solicitações...</div>
          ) : pendingRequests.length === 0 ? (
            <div className="tm-empty tm-empty--quiet">
              <CheckCircle2 size={24} />
              <strong>Não há solicitações pendentes</strong>
              <span>Novos pedidos de ajuste aparecerão aqui.</span>
            </div>
          ) : (
            <div className="tm-request-list">
              {pendingRequests.map((request) => (
                <article className="tm-request-card" key={request.id}>
                  <div className="tm-request-card__main">
                    <div className="tm-request-person">
                      <div className="tm-avatar"><UserRound size={18} /></div>
                      <div>
                        <strong>{request.employee?.full_name || "Colaborador não localizado"}</strong>
                        <span>{request.employee?.cpf || "CPF não disponível"} · {dateLabel(request.punch_date)}</span>
                      </div>
                    </div>
                    <span className="tm-pending-label">Pendente</span>
                  </div>
                  <div className="tm-request-detail-grid">
                    <div className="tm-request-detail">
                      <small>Motivo</small>
                      <strong>{REQUEST_TYPES[request.request_type] || request.request_type}</strong>
                    </div>
                    <div className="tm-request-detail tm-request-detail--wide">
                      <small>Horários solicitados</small>
                      <RequestedTimes request={request} />
                    </div>
                    <div className="tm-request-detail tm-request-detail--full">
                      <small>Justificativa do colaborador</small>
                      <p>{request.description}</p>
                    </div>
                    <div className="tm-request-detail tm-request-detail--full">
                      <small>Comprovante do colaborador</small>

                      {request.attachment_path ? (
                        <button
                          type="button"
                          className="tm-attachment-button"
                          onClick={() => viewAttachment(request)}
                          disabled={openingAttachmentId === request.id}
                        >
                          <Paperclip size={16} />

                          {openingAttachmentId === request.id
                            ? "Carregando comprovante..."
                            : "Visualizar comprovante"}
                        </button>
                      ) : (
                        <span className="tm-no-attachment">
                          Nenhum comprovante anexado.
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="tm-review-actions">
                    <label className="tm-field tm-field--review">
                      <span>Observação da análise {`(obrigatória para reprovar)`}</span>
                      <input
                        type="text"
                        maxLength={500}
                        value={reviewNotes[request.id] || ""}
                        placeholder="Informe o motivo da decisão ou da reprovação"
                        onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                      />
                    </label>
                    <div className="tm-review-buttons">
                      <button type="button" className="tm-reject-button" disabled={workingRequestId === request.id} onClick={() => reviewRequest(request, "rejected")}>
                        <XCircle size={16} /> Reprovar
                      </button>
                      <button type="button" className="tm-approve-button" disabled={workingRequestId === request.id} onClick={() => reviewRequest(request, "approved")}>
                        <CheckCircle2 size={16} /> {workingRequestId === request.id ? "Processando..." : "Aprovar"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="tm-section">
          <div className="tm-section-header">
            <div>
              <h2>Espelho de ponto do colaborador</h2>
              <p>Selecione qualquer colaborador ativo e o período que deseja consultar.</p>
            </div>
          </div>

          <div className="tm-filter-bar">
            <label className="tm-field tm-field--employee">
              <span>Colaborador</span>
              <select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)} disabled={loadingBase || employees.length === 0}>
                {employees.length === 0 && <option value="">Nenhum colaborador encontrado</option>}
                {employees.map((employee) => (
                  <option value={employee.id} key={employee.id}>{employee.full_name} · {employee.cpf || "sem CPF"}</option>
                ))}
              </select>
            </label>
            <label className="tm-field tm-field--month">
              <span>Mês de referência</span>
              <input type="month" value={monthValue} onChange={(event) => setMonthValue(event.target.value)} />
            </label>
          </div>

          {selectedEmployee && (
            <div className="tm-employee-banner">
              <div className="tm-avatar tm-avatar--large"><UserRound size={20} /></div>
              <div className="tm-employee-banner__details">
                <strong>{selectedEmployee.full_name}</strong>
                <span>{selectedEmployee.cpf || "CPF não informado"}{selectedEmployee.departments?.name ? ` · ${selectedEmployee.departments.name}` : ""}{selectedEmployee.positions?.name ? ` · ${selectedEmployee.positions.name}` : ""}</span>
              </div>
              <span className="tm-active-badge">{selectedEmployee.status === "active" ? "Ativo" : selectedEmployee.status}</span>
            </div>
          )}

          <div className="tm-summary-grid">
            <article className="tm-summary-card"><span>Horas trabalhadas</span><strong>{loadingPunches ? "—" : formatDuration(summary.worked)}</strong><small>{summary.period}</small></article>
            <article className="tm-summary-card"><span>Horas previstas</span><strong>{loadingPunches ? "—" : formatDuration(summary.expected)}</strong><small>8h em dias úteis · 4h aos sábados</small></article>
            <article className={`tm-summary-card ${summary.balance >= 0 ? "tm-summary-card--positive" : "tm-summary-card--negative"}`}><span>Saldo do período</span><strong>{loadingPunches ? "—" : `${summary.balance > 0 ? "+" : ""}${formatDuration(summary.balance)}`}</strong><small>{summary.balance >= 0 ? "Saldo positivo" : "Saldo negativo estimado"}</small></article>
          </div>

          <div className="tm-table-wrap">
            {loadingPunches ? (
              <div className="tm-empty"><RefreshCw size={21} className="tm-spin" />Carregando espelho do colaborador...</div>
            ) : !selectedEmployeeId ? (
              <div className="tm-empty">Selecione um colaborador para consultar as batidas.</div>
            ) : (
              <table className="tm-table">
                <thead><tr><th>Data</th><th>Jornada prevista</th><th>Batidas registradas</th><th>Trabalhado</th><th>Saldo do dia</th><th>Situação</th></tr></thead>
                <tbody>
                  {days.map((day) => (
                    <tr key={day.date}>
                      <td className="tm-date-cell"><strong>{dateLabel(day.date)}</strong><span>{weekdayLabel(day.date)}</span>{day.type === "holiday" && <small className="tm-holiday-name">{holidaysByDate[day.date]?.name || "Feriado"}</small>}</td>
                      <td>{day.type === "holiday" ? "Feriado" : day.type === "rest" ? "Repouso" : formatDuration(day.scheduled)}</td>
                      <td>
                        {day.list.length === 0 ? (
                          <span className="tm-muted">{day.status === "future" ? "Ainda não há registros" : day.type === "rest" ? "Repouso semanal" : day.type === "holiday" ? (holidaysByDate[day.date]?.name || "Feriado") : "Nenhuma batida registrada"}</span>
                        ) : (
                          <div className="tm-punch-list">
                            {[...day.list].sort((a, b) => String(a.punched_at).localeCompare(String(b.punched_at))).map((punch, index) => {
                              const defaultLabels = day.type === "saturday" ? ["Entrada", "Saída"] : ["Entrada", "Saída intervalo", "Retorno intervalo", "Saída"];
                              const label = PUNCH_TYPE_LABELS[punch.punch_type] || defaultLabels[index] || `Batida ${index + 1}`;
                              return <span className="tm-punch-tag" key={punch.id}><small>{label}</small><strong>{punchTime(punch.punched_at)}</strong></span>;
                            })}
                          </div>
                        )}
                      </td>
                      <td>{formatDuration(day.worked)}</td>
                      <td>{day.balance === null ? "—" : <strong className={day.balance > 0 ? "tm-positive-text" : day.balance < 0 ? "tm-negative-text" : ""}>{day.balance > 0 ? "+" : ""}{formatDuration(day.balance)}</strong>}</td>
                      <td><DayStatus status={day.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="tm-section">
          <div className="tm-section-header">
            <div>
              <h2>Feriados</h2>
              <p>Cadastre feriados do calendário; o dia deixa de gerar jornada prevista no espelho.</p>
            </div>
            <button type="button" className="tm-outline-button" onClick={() => setShowHolidayForm((value) => !value)}>
              {showHolidayForm ? <XCircle size={16} /> : <Plus size={16} />}
              {showHolidayForm ? "Cancelar" : "Cadastrar feriado"}
            </button>
          </div>

          {showHolidayForm && (
            <form className="tm-holiday-form" onSubmit={addHoliday}>
              <label className="tm-field"><span>Data *</span><input type="date" value={holidayForm.date} required onChange={(e) => setHolidayForm((old) => ({ ...old, date: e.target.value }))} /></label>
              <label className="tm-field"><span>Nome do feriado *</span><input type="text" value={holidayForm.name} required maxLength={150} placeholder="Ex.: Feriado municipal" onChange={(e) => setHolidayForm((old) => ({ ...old, name: e.target.value }))} /></label>
              <label className="tm-field tm-field--description"><span>Descrição (opcional)</span><input type="text" value={holidayForm.description} maxLength={500} placeholder="Detalhes adicionais" onChange={(e) => setHolidayForm((old) => ({ ...old, description: e.target.value }))} /></label>
              <button type="submit" className="tm-approve-button" disabled={savingHoliday}><Plus size={16} />{savingHoliday ? "Salvando..." : "Salvar feriado"}</button>
            </form>
          )}

          {holidays.length === 0 ? (
            <div className="tm-empty tm-empty--compact"><CalendarDays size={20} />Nenhum feriado ativo neste mês.</div>
          ) : (
            <div className="tm-holiday-list">
              {holidays.map((holiday) => (
                <div className="tm-holiday-row" key={holiday.id}>
                  <div className="tm-holiday-icon"><CalendarDays size={17} /></div>
                  <div className="tm-holiday-row__text"><strong>{holiday.name}</strong><span>{dateLabel(holiday.holiday_date)}{holiday.description ? ` · ${holiday.description}` : ""}</span></div>
                  <button type="button" className="tm-icon-button" title="Remover feriado do calendário ativo" onClick={() => deactivateHoliday(holiday)}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </section>
        {attachmentPreview && (
          <div
            className="tm-attachment-modal"
            onClick={() => setAttachmentPreview(null)}
          >
            <section
              className="tm-attachment-modal__content"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Visualização do comprovante"
            >
              <header className="tm-attachment-modal__header">
                <div>
                  <h2>Comprovante da solicitação</h2>
                  <p>{attachmentPreview.name}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setAttachmentPreview(null)}
                  aria-label="Fechar comprovante"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="tm-attachment-modal__body">
                {attachmentPreview.type === "image" ? (
                  <img
                    src={attachmentPreview.url}
                    alt="Comprovante enviado pelo colaborador"
                  />
                ) : (
                  <iframe
                    src={attachmentPreview.url}
                    title="Comprovante em PDF"
                  />
                )}
              </div>

              <footer className="tm-attachment-modal__footer">
                <button
                  type="button"
                  className="tm-outline-button"
                  onClick={() => setAttachmentPreview(null)}
                >
                  Fechar visualização
                </button>
              </footer>
            </section>
          </div>
        )}
        <footer className="tm-footer">
          <span>Gestão de ponto · Nexo RH</span>
          <span>As decisões e correções são registradas no histórico de auditoria.</span>
        </footer>
      </main>
    </DashboardLayout>
  );
}
