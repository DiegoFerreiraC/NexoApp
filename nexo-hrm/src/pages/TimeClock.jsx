import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "../services/supabase";
import "../styles/time-clock.css";


const REQUEST_TYPES = [
  ["missing_punch", "Esquecimento / falta de batida"],
  ["incorrect_time", "Horário registrado incorretamente"],
  ["power_outage", "Queda de energia"],
  ["equipment_failure", "Problema no relógio ou equipamento"],
  ["medical_certificate", "Atestado médico"],
  ["justified_absence", "Ausência justificada"],
  ["other", "Outro motivo"],
];

const REQUEST_LABELS = Object.fromEntries(REQUEST_TYPES);

const REQUESTED_TIMES = [
  ["requested_entry_time", "Entrada"],
  ["requested_lunch_start_time", "Saída para intervalo"],
  ["requested_lunch_end_time", "Retorno do intervalo"],
  ["requested_exit_time", "Saída"],
];
const STATUS_LABELS = { pending: "Pendente", approved: "Aprovada", rejected: "Reprovada" };
const pad = (n) => String(n).padStart(2, "0");

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function currentMonthString() {
  return todayString().slice(0, 7);
}
function nextMonth(value) {
  const [y, m] = value.split("-").map(Number);
  const d = new Date(y, m, 1);
  // Retorna a data completa do primeiro dia do mês seguinte.
  // O Supabase precisa de YYYY-MM-DD ao filtrar campos date/timestamp.
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}
function dateLabel(value) {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(y, m - 1, d));
}
function weekdayLabel(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
    .format(new Date(y, m - 1, d));
}
function duration(minutes) {
  const n = Math.abs(Math.round(minutes || 0));
  return `${minutes < 0 ? "-" : ""}${Math.floor(n / 60)}h${pad(n % 60)}`;
}
function punchDate(p) {
  return String(p.punched_at).slice(0, 10);
}
function punchTime(p) {
  return String(p.punched_at).slice(11, 16);
}
function timeToMinutes(p) {
  const [h, m] = punchTime(p).split(":").map(Number);
  return h * 60 + m;
}
function workedMinutes(punches) {
  const list = [...punches].sort((a, b) =>
    String(a.punched_at).localeCompare(String(b.punched_at)));
  let sum = 0;
  // Pares sequenciais: entrada/saída de intervalo e retorno/saída.
  // A última batida de um conjunto ímpar fica sem contabilização.
  for (let i = 0; i + 1 < list.length; i += 2) {
    const start = timeToMinutes(list[i]);
    const end = timeToMinutes(list[i + 1]);
    if (end > start) sum += end - start;
  }
  return sum;
}
function dayType(value, holidaysByDate) {
  if (holidaysByDate[value]) return "holiday";
  const [y, m, d] = value.split("-").map(Number);
  const w = new Date(y, m - 1, d).getDay();
  if (w === 0) return "rest";
  if (w === 6) return "saturday";
  return "weekday";
}
function scheduledMinutes(value, holidaysByDate) {
  const type = dayType(value, holidaysByDate);
  if (type === "holiday" || type === "rest") return 0;
  return type === "saturday" ? 240 : 480;
}
function StatusPill({ status }) {
  const labels = {
    future: "Futuro", holiday: "Feriado", rest: "Repouso",
    missing: "Sem batidas", incomplete: "Incompleto",
    review: "Conferir", complete: "Completo",
  };
  return <span className={`time-status time-status--${status}`}>{labels[status]}</span>;
}
function RequestStatus({ status }) {
  return <span className={`time-request-status time-request-status--${status}`}>
    {STATUS_LABELS[status] || status}
  </span>;
}

export default function TimeClock() {
  const [monthValue, setMonthValue] = useState(currentMonthString());
  const [profile, setProfile] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [punches, setPunches] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState({
    punch_date: todayString(),
    request_type: "missing_punch",
    requested_entry_time: "",
    requested_lunch_start_time: "",
    requested_lunch_end_time: "",
    requested_exit_time: "",
    description: "",
  });

  const loadData = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Sua sessão expirou. Entre novamente no Nexo RH.");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, employee_id, role")
        .eq("id", authData.user.id)
        .single();
      if (profileError) throw profileError;
      if (!profileData?.employee_id) {
        throw new Error("Seu usuário não está vinculado a um cadastro de colaborador.");
      }

      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id, full_name, status")
        .eq("id", profileData.employee_id)
        .single();
      if (employeeError) throw employeeError;

      const start = `${monthValue}-01`;
      const end = nextMonth(monthValue);
      const [punchResult, holidayResult, requestResult] = await Promise.all([
        supabase.from("time_punches")
          .select("id, employee_id, punched_at, punch_source, note")
          .eq("employee_id", profileData.employee_id)
          .eq("is_active", true)
          .gte("punched_at", `${start} 00:00:00`)
          .lt("punched_at", `${end} 00:00:00`)
          .order("punched_at", { ascending: true }),
        supabase.from("time_holidays")
          .select("id, holiday_date, name")
          .eq("is_active", true)
          .gte("holiday_date", start)
          .lt("holiday_date", end)
          .order("holiday_date", { ascending: true }),
        supabase.from("time_adjustment_requests")
          .select("id, punch_date, request_type, punch_type, status, description, review_note, attachment_path, requested_punch_time, requested_entry_time, requested_lunch_start_time, requested_lunch_end_time, requested_exit_time, created_at")
          .gte("punch_date", start)
          .lt("punch_date", end)
          .order("created_at", { ascending: false }),
      ]);

      if (punchResult.error) throw punchResult.error;
      if (holidayResult.error) throw holidayResult.error;
      if (requestResult.error) throw requestResult.error;

      setProfile(profileData);
      setEmployee(employeeData);
      setPunches(punchResult.data || []);
      setHolidays(holidayResult.data || []);
      setRequests(requestResult.data || []);
    } catch (e) {
      console.error("Erro ao carregar espelho de ponto:", e);
      setError(e.message || "Não foi possível carregar o espelho de ponto.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monthValue]);

  useEffect(() => { loadData(); }, [loadData]);

  const today = todayString();
  const currentMonth = currentMonthString();

  const holidaysByDate = useMemo(
    () => Object.fromEntries(holidays.map((h) => [h.holiday_date, h])),
    [holidays],
  );
  const punchesByDate = useMemo(() => {
    const grouped = {};
    punches.forEach((p) => {
      const date = punchDate(p);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(p);
    });
    return grouped;
  }, [punches]);

  const days = useMemo(() => {
    const [year, month] = monthValue.split("-").map(Number);
    const numberOfDays = new Date(year, month, 0).getDate();
    return Array.from({ length: numberOfDays }, (_, i) => {
      const date = `${year}-${pad(month)}-${pad(i + 1)}`;
      const list = punchesByDate[date] || [];
      const type = dayType(date, holidaysByDate);
      const scheduled = scheduledMinutes(date, holidaysByDate);
      const worked = workedMinutes(list);
      const future = date > today;
      let status = "complete";
      if (type === "holiday") status = "holiday";
      else if (type === "rest") status = "rest";
      else if (future) status = "future";
      else if (!list.length) status = "missing";
      else if (list.length < (type === "saturday" ? 2 : 4) || list.length % 2 !== 0) status = "incomplete";
      else if (list.length > (type === "saturday" ? 2 : 4)) status = "review";

      const included = monthValue < currentMonth ||
        (monthValue === currentMonth && date <= today);
      return {
        date, list, type, scheduled, worked, status, included,
        balance: future || type === "holiday" || type === "rest"
          ? null : worked - scheduled,
      };
    });
  }, [monthValue, punchesByDate, holidaysByDate, today, currentMonth]);

  const summary = useMemo(() => {
    const includedDays = days.filter((d) => d.included);
    const expected = includedDays.reduce((s, d) => s + d.scheduled, 0);
    const worked = includedDays.reduce((s, d) => s + d.worked, 0);
    const balance = worked - expected;
    return {
      expected, worked, balance,
      extra: Math.max(balance, 0),
      owed: Math.max(-balance, 0),
      periodLabel: monthValue < currentMonth
        ? "Mês completo"
        : monthValue === currentMonth
          ? `Até ${dateLabel(today)}`
          : "Período futuro",
    };
  }, [days, monthValue, currentMonth, today]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const requiresAttachment = form.request_type === "medical_certificate";
  const allowsAttachment = ["medical_certificate", "justified_absence"].includes(form.request_type);
  const timeRelated = ["missing_punch", "incorrect_time", "power_outage", "equipment_failure"].includes(form.request_type);

  function updateForm(key, value) {
    setForm((old) => ({ ...old, [key]: value }));

    if (key === "request_type") {
      setSelectedFile(null);
    }
  }

  async function submitRequest(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!profile?.employee_id) {
      setError("Não foi possível identificar seu cadastro de colaborador.");
      return;
    }

    if (!form.punch_date || !form.request_type || !form.description.trim()) {
      setError("Preencha a data, o motivo e a justificativa.");
      return;
    }
    if (requiresAttachment && !selectedFile) {
      setError("Anexe o atestado médico para continuar.");
      return;
    }

    if (selectedFile && allowsAttachment) {
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Envie um arquivo PDF, JPG ou PNG.");
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("O arquivo deve ter no máximo 5 MB.");
        return;
      }
    }

    const requestedTimes = {
      requested_entry_time: timeRelated
        ? form.requested_entry_time || null
        : null,
      requested_lunch_start_time: timeRelated
        ? form.requested_lunch_start_time || null
        : null,
      requested_lunch_end_time: timeRelated
        ? form.requested_lunch_end_time || null
        : null,
      requested_exit_time: timeRelated
        ? form.requested_exit_time || null
        : null,
    };

    if (timeRelated && !Object.values(requestedTimes).some(Boolean)) {
      setError("Informe pelo menos um dos horários que deseja solicitar.");
      return;
    }


    setSubmitting(true);

    let attachmentPath = null;
    const requestId = crypto.randomUUID();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Sua sessão expirou. Faça login novamente.");

      // Envia o comprovante para o Storage privado
      if (selectedFile && allowsAttachment) {
        const extension = selectedFile.name
          .split(".")
          .pop()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        const fileName = `comprovante.${extension}`;

        attachmentPath = `${user.id}/${requestId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("time-adjustment-attachments")
          .upload(attachmentPath, selectedFile, {
            contentType: selectedFile.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;
      }

      const { error: insertError } = await supabase
        .from("time_adjustment_requests")
        .insert({
          id: requestId,
          employee_id: profile.employee_id,
          punch_date: form.punch_date,
          request_type: form.request_type,
          punch_type: "not_applicable",
          requested_punch_time: null,
          ...requestedTimes,
          description: form.description.trim(),
          attachment_path: attachmentPath,
          status: "pending",
        });

      if (insertError) throw insertError;

      setSuccess("Solicitação enviada ao RH para análise.");
      setShowForm(false);
      setSelectedFile(null);

      setForm({
        punch_date: today,
        request_type: "missing_punch",
        requested_entry_time: "",
        requested_lunch_start_time: "",
        requested_lunch_end_time: "",
        requested_exit_time: "",
        description: "",
      });

      await loadData(true);

    } catch (submitError) {
      console.error("Erro ao enviar solicitação:", submitError);

      // Remove o arquivo caso o cadastro da solicitação falhe
      if (attachmentPath) {
        await supabase.storage
          .from("time-adjustment-attachments")
          .remove([attachmentPath]);
      }

      setError(
        submitError.message ||
        "Não foi possível enviar a solicitação."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function renderPunches(day) {
    if (!day.list.length) {
      if (day.status === "future") return <span className="time-muted">Ainda não há registros</span>;
      if (day.type === "rest") return <span className="time-muted">Repouso semanal</span>;
      if (day.type === "holiday") return <span className="time-muted">{holidaysByDate[day.date]?.name || "Feriado"}</span>;
      return <span className="time-muted">Nenhuma batida registrada</span>;
    }
    const list = [...day.list].sort((a, b) => String(a.punched_at).localeCompare(String(b.punched_at)));
    return <div className="time-punch-list">
      {list.map((p, i) => {
        const label = day.type === "saturday"
          ? (i === 0 ? "Entrada" : i === 1 ? "Saída" : `Batida ${i + 1}`)
          : (["Entrada", "Saída intervalo", "Retorno intervalo", "Saída"][i] || `Batida ${i + 1}`);
        return <span className="time-punch-chip" key={p.id} title={label}>
          <small>{label}</small><strong>{punchTime(p)}</strong>
        </span>;
      })}
    </div>;
  }

  return (
    <DashboardLayout>
      <main className="time-clock-page">
        <header className="time-clock-header">
          <div>
            <div className="time-clock-eyebrow"><CalendarDays size={15} /> CONTROLE DE JORNADA</div>
            <h1>Espelho de ponto</h1>
            <p>{employee?.full_name
              ? `Confira suas batidas e seu saldo de horas, ${employee.full_name.split(" ")[0]}.`
              : "Confira suas batidas e o saldo de horas do período."}</p>
          </div>
          <div className="time-clock-header__actions">
            <label className="time-month-picker">
              <span>Mês de referência</span>
              <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} />
            </label>
            <button type="button" className="time-clock-refresh" onClick={() => loadData(true)} disabled={refreshing || loading}>
              <RefreshCw size={16} className={refreshing ? "time-spin" : ""} /> Atualizar
            </button>
          </div>
        </header>

        {error && <div className="time-alert time-alert--error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
        {success && <div className="time-alert time-alert--success" role="status">
          <CheckCircle2 size={18} /><span>{success}</span>
          <button type="button" onClick={() => setSuccess("")} aria-label="Fechar mensagem"><X size={16} /></button>
        </div>}

        <section className="time-summary-grid">
          <article className="time-summary-card">
            <div className="time-summary-card__icon time-purple"><Clock size={19} /></div>
            <span>Horas trabalhadas</span><strong>{loading ? "—" : duration(summary.worked)}</strong><small>{summary.periodLabel}</small>
          </article>
          <article className="time-summary-card">
            <div className="time-summary-card__icon time-gray"><CalendarDays size={19} /></div>
            <span>Horas previstas</span><strong>{loading ? "—" : duration(summary.expected)}</strong><small>Conforme a jornada</small>
          </article>
          <article className={`time-summary-card ${summary.balance >= 0 ? "time-positive" : "time-negative"}`}>
            <div className="time-summary-card__icon"><CheckCircle2 size={19} /></div>
            <span>Saldo do período</span>
            <strong>{loading ? "—" : `${summary.balance > 0 ? "+" : ""}${duration(summary.balance)}`}</strong>
            <small>{summary.balance >= 0 ? "Saldo positivo" : "Saldo negativo estimado"}</small>
          </article>
          <article className="time-summary-card">
            <div className="time-summary-card__icon time-purple"><FileText size={19} /></div>
            <span>Pedidos pendentes</span><strong>{loading ? "—" : pendingCount}</strong><small>Aguardando análise</small>
          </article>
        </section>

        <div className="time-clock-note">
          <AlertCircle size={17} />
          <p>Confira suas marcações e solicite um ajuste ao RH caso identifique alguma divergência.</p>
        </div>

        <section className="time-panel">
          <div className="time-panel__header">
            <div>
              <h2>Registros do mês</h2>
              <p>Segunda a sexta: 07:30–11:30 e 13:30–17:30 · Sábado: 08:00–12:00 · Domingo: repouso.</p>
            </div>
            <button type="button" className="time-primary-button" onClick={() => { setError(""); setSuccess(""); setShowForm((v) => { if (v) setSelectedFile(null); return !v; }); }}>
              {showForm ? <X size={17} /> : <Plus size={17} />}
              {showForm ? "Fechar formulário" : "Solicitar ajuste"}
            </button>
          </div>

          {showForm && <form className="time-request-form" onSubmit={submitRequest}>
            <div className="time-request-form__heading">
              <div><h3>Solicitação de ajuste de ponto</h3><p>O pedido será enviado ao RH para análise.</p></div>
              <FileText size={22} />
            </div>
            <div className="time-form-grid">
              <label className="time-field"><span>Data do ocorrido *</span>
                <input type="date" value={form.punch_date} max={today} required onChange={(e) => updateForm("punch_date", e.target.value)} />
              </label>
              <label className="time-field"><span>Motivo *</span>
                <select value={form.request_type} required onChange={(e) => updateForm("request_type", e.target.value)}>
                  {REQUEST_TYPES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </label>
              {timeRelated && <div className="time-field time-field--full">
                <span>Horários que deseja ajustar</span>
                <p className="time-field-help">Preencha todos os horários que precisam ser incluídos ou corrigidos nesta data. Os demais podem ficar em branco.</p>
                <div className="time-punch-input-grid">
                  <label className="time-field">
                    <span>Entrada</span>
                    <input type="time" value={form.requested_entry_time} onChange={(e) => updateForm("requested_entry_time", e.target.value)} />
                  </label>
                  <label className="time-field">
                    <span>Saída para intervalo</span>
                    <input type="time" value={form.requested_lunch_start_time} onChange={(e) => updateForm("requested_lunch_start_time", e.target.value)} />
                  </label>
                  <label className="time-field">
                    <span>Retorno do intervalo</span>
                    <input type="time" value={form.requested_lunch_end_time} onChange={(e) => updateForm("requested_lunch_end_time", e.target.value)} />
                  </label>
                  <label className="time-field">
                    <span>Saída</span>
                    <input type="time" value={form.requested_exit_time} onChange={(e) => updateForm("requested_exit_time", e.target.value)} />
                  </label>
                </div>
              </div>}
              <label className="time-field time-field--full"><span>Justificativa *</span>
                <textarea value={form.description} required maxLength={2000} rows={4}
                  placeholder="Descreva o ocorrido e explique o ajuste solicitado."
                  onChange={(e) => updateForm("description", e.target.value)} />
                <small>{form.description.length}/2000 caracteres</small>
              </label>
              {allowsAttachment && (
                <label className="time-field time-field--full">
                  <span>
                    Comprovante
                    {requiresAttachment ? " *" : " (opcional)"}
                  </span>

                  <input
                    key={form.request_type}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    required={requiresAttachment}
                    onChange={(event) => {
                      setSelectedFile(event.target.files?.[0] || null);
                    }}
                  />

                  <small>
                    {requiresAttachment
                      ? "Anexe o atestado médico em PDF ou imagem."
                      : "Se possuir comprovante, você pode anexá-lo aqui."}
                    {" "}Limite de 5 MB.
                  </small>

                  {selectedFile && (
                    <small>
                      Arquivo selecionado: {selectedFile.name}
                    </small>
                  )}
                </label>
              )}
            </div>
            <div className="time-request-form__actions">
              <button type="button" className="time-secondary-button" disabled={submitting} onClick={() => { setShowForm(false); setSelectedFile(null); }}>Cancelar</button>
              <button type="submit" className="time-primary-button" disabled={submitting}><Send size={16} />{submitting ? "Enviando..." : "Enviar para o RH"}</button>
            </div>
          </form>}

          {loading ? <div className="time-empty-state"><RefreshCw size={22} className="time-spin" /><strong>Carregando espelho de ponto...</strong></div> :
            <div className="time-table-wrap"><table className="time-table">
              <thead><tr><th>Data</th><th>Jornada prevista</th><th>Batidas registradas</th><th>Trabalhado</th><th>Saldo do dia</th><th>Situação</th></tr></thead>
              <tbody>{days.map((day) => <tr key={day.date}>
                <td className="time-date-cell"><strong>{dateLabel(day.date)}</strong><span>{weekdayLabel(day.date)}</span>
                  {day.type === "holiday" && <small className="time-holiday-name">{holidaysByDate[day.date]?.name}</small>}
                </td>
                <td><span className={day.type === "holiday" || day.type === "rest" ? "time-muted" : ""}>
                  {day.type === "holiday" ? "Feriado" : day.type === "rest" ? "Repouso" : duration(day.scheduled)}
                </span></td>
                <td>{renderPunches(day)}</td>
                <td>{duration(day.worked)}</td>
                <td>{day.balance === null ? "—" : <span className={day.balance > 0 ? "time-value-positive" : day.balance < 0 ? "time-value-negative" : ""}>{day.balance > 0 ? "+" : ""}{duration(day.balance)}</span>}</td>
                <td><StatusPill status={day.status} /></td>
              </tr>)}</tbody>
            </table></div>}
        </section>

        <section className="time-panel time-requests-panel">
          <div className="time-panel__header">
            <div><h2>Minhas solicitações</h2><p>Acompanhe os pedidos de ajuste enviados ao RH.</p></div>
            <span className="time-request-count">{requests.length} no mês</span>
          </div>
          {loading ? <div className="time-empty-state time-empty-state--small">Carregando solicitações...</div> :
            requests.length === 0 ? <div className="time-empty-state time-empty-state--small"><FileText size={22} /><strong>Nenhuma solicitação neste mês</strong><span>Seus pedidos aparecerão aqui.</span></div> :
              <div className="time-requests-list">{requests.map((request) => <article className="time-request-item" key={request.id}>
                <div className="time-request-item__icon"><FileText size={18} /></div>
                <div className="time-request-item__body">
                  <div className="time-request-item__top"><strong>{REQUEST_LABELS[request.request_type] || request.request_type}</strong><RequestStatus status={request.status} /></div>
                  <span>{dateLabel(request.punch_date)}</span>
                  <p>{request.description}</p>
                  {REQUESTED_TIMES.some(([field]) => request[field]) && (
                    <div className="time-requested-times">
                      {REQUESTED_TIMES.filter(([field]) => request[field]).map(([field, label]) => (
                        <span className="time-requested-time" key={field}>
                          <small>{label}</small>
                          <strong>{String(request[field]).slice(0, 5)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                  {request.review_note && <small className="time-review-note">Retorno do RH: {request.review_note}</small>}
                </div>
              </article>)}</div>}
        </section>
        <footer className="time-clock-footer"><span>Espelho de ponto · Nexo RH</span><span>Os horários exibidos são os registros disponíveis no banco de dados.</span></footer>
      </main>
    </DashboardLayout>
  );
}
