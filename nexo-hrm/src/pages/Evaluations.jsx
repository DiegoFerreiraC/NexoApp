import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  RefreshCw,
  Save,
  Star,
  UserRound,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "../services/supabase";
import "../styles/evaluations.css";

const CRITERIA = [
  {
    key: "productivity",
    title: "Produtividade",
    question: "Entrega as atividades e cumpre os objetivos combinados dentro dos prazos?",
  },
  {
    key: "quality",
    title: "Qualidade do trabalho",
    question: "Executa as atividades com atenção, precisão e cuidado com os resultados?",
  },
  {
    key: "punctuality",
    title: "Pontualidade e assiduidade",
    question: "Cumpre os horários e mantém uma frequência adequada, considerando justificativas registradas?",
  },
  {
    key: "communication",
    title: "Comunicação",
    question: "Compartilha informações com clareza, respeito e no momento adequado?",
  },
  {
    key: "teamwork",
    title: "Trabalho em equipe",
    question: "Colabora com colegas e contribui para um ambiente profissional respeitoso?",
  },
  {
    key: "initiative",
    title: "Iniciativa e resolução",
    question: "Demonstra iniciativa e busca soluções adequadas para os desafios do trabalho?",
  },
  {
    key: "responsibility",
    title: "Responsabilidade",
    question: "Demonstra compromisso com suas atribuições, procedimentos e acordos profissionais?",
  },
];

const pad = (n) => String(n).padStart(2, "0");

function currentMonthString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function dateLabel(value) {
  if (!value) return "—";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(y, m - 1, d));
}

function monthLabel(value) {
  const [y, m] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(new Date(y, m - 1, 1));
}

function average(scores) {
  const values = scores.map(Number).filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageLabel(value) {
  return value === null || value === undefined
    ? "—"
    : value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function fileToken(value) {
  return String(value || "relatorio")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function createEmptyScores() {
  return Object.fromEntries(CRITERIA.map((criterion) => [criterion.key, ""]));
}

function evaluationAverage(evaluation) {
  if (!evaluation?.answers?.length) return null;
  return average(evaluation.answers.map((answer) => answer.score));
}

export default function Evaluations() {
  const [role, setRole] = useState(null);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [monthValue, setMonthValue] = useState(currentMonthString());
  const [evaluations, setEvaluations] = useState([]);
  const [scores, setScores] = useState(createEmptyScores);
  const [generalComment, setGeneralComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = role === "hr" || role === "admin";
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const monthDate = `${monthValue}-01`;

  const loadBase = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoadingBase(true);
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Sua sessão expirou. Entre novamente no Nexo RH.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();
      if (profileError) throw profileError;
      if (!["hr", "admin"].includes(profile?.role)) {
        throw new Error("Você não tem permissão para acessar as avaliações.");
      }

      setRole(profile.role);

      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id, full_name, cpf, email, status, departments(name), positions(name)")
        .order("full_name", { ascending: true });
      if (employeeError) throw employeeError;

      const rows = employeeData || [];
      setEmployees(rows);
      setSelectedEmployeeId((currentId) => (
        currentId && rows.some((employee) => employee.id === currentId)
          ? currentId
          : rows.find((employee) => employee.status === "active")?.id || rows[0]?.id || ""
      ));
    } catch (loadError) {
      console.error("Erro ao carregar tela de avaliações:", loadError);
      setError(loadError.message || "Não foi possível carregar a tela de avaliações.");
    } finally {
      setLoadingBase(false);
      setRefreshing(false);
    }
  }, []);

  const loadMonthEvaluations = useCallback(async () => {
    if (!isAdmin) {
      setEvaluations([]);
      return;
    }

    setLoadingEvaluations(true);
    setError("");

    try {
      const { data: rows, error: evaluationsError } = await supabase
        .from("employee_evaluations")
        .select("id, employee_id, evaluator_profile_id, reference_month, general_comment, created_at, updated_at")
        .eq("reference_month", monthDate)
        .order("created_at", { ascending: false });
      if (evaluationsError) throw evaluationsError;

      const evaluationRows = rows || [];
      let answers = [];

      if (evaluationRows.length) {
        const { data: answerRows, error: answersError } = await supabase
          .from("employee_evaluation_answers")
          .select("id, evaluation_id, criterion_key, question, score, note, created_at")
          .in("evaluation_id", evaluationRows.map((evaluation) => evaluation.id));
        if (answersError) throw answersError;
        answers = answerRows || [];
      }

      const combined = evaluationRows.map((evaluation) => ({
        ...evaluation,
        employee: employees.find((employee) => employee.id === evaluation.employee_id) || null,
        answers: answers
          .filter((answer) => answer.evaluation_id === evaluation.id)
          .sort((a, b) => CRITERIA.findIndex((c) => c.key === a.criterion_key) - CRITERIA.findIndex((c) => c.key === b.criterion_key)),
      }));
      setEvaluations(combined);
    } catch (loadError) {
      console.error("Erro ao carregar avaliações mensais:", loadError);
      setError(loadError.message || "Não foi possível carregar as avaliações do mês.");
    } finally {
      setLoadingEvaluations(false);
    }
  }, [isAdmin, monthDate, employees]);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    loadMonthEvaluations();
  }, [loadMonthEvaluations]);

  const selectedEvaluation = evaluations.find(
    (evaluation) => evaluation.employee_id === selectedEmployeeId,
  );

  useEffect(() => {
    if (selectedEvaluation) {
      const nextScores = createEmptyScores();
      selectedEvaluation.answers.forEach((answer) => {
        nextScores[answer.criterion_key] = String(answer.score);
      });
      setScores(nextScores);
      setGeneralComment(selectedEvaluation.general_comment || "");
    } else {
      setScores(createEmptyScores());
      setGeneralComment("");
    }
  }, [
    selectedEmployeeId,
    monthValue,
    selectedEvaluation?.id,
    selectedEvaluation?.updated_at,
  ]);

  const employeeRows = useMemo(() => {
    return employees.map((employee) => {
      const evaluation = evaluations.find((item) => item.employee_id === employee.id) || null;
      return {
        employee,
        evaluation,
        average: evaluationAverage(evaluation),
        evaluated: Boolean(evaluation),
      };
    });
  }, [employees, evaluations]);

  const evaluatedRows = employeeRows.filter((row) => row.evaluated);
  const companyAverage = average(evaluatedRows.map((row) => row.average).filter((v) => v !== null));
  const ratedEmployees = evaluatedRows.length;
  const coverage = employees.length
    ? Math.round((ratedEmployees / employees.length) * 100)
    : 0;

  function updateScore(key, value) {
    if (value === "" || (Number(value) >= 0 && Number(value) <= 10)) {
      setScores((current) => ({ ...current, [key]: value }));
    }
  }

  async function saveEvaluation(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedEmployeeId) {
      setError("Selecione um colaborador.");
      return;
    }

    const unanswered = CRITERIA.filter((criterion) => scores[criterion.key] === "");
    if (unanswered.length) {
      setError(`Preencha todas as notas de 0 a 10. Faltam ${unanswered.length} pergunta(s).`);
      return;
    }

    const answers = CRITERIA.map((criterion) => ({
      criterion_key: criterion.key,
      question: criterion.question,
      score: Number(scores[criterion.key]),
      note: null,
    }));

    setSaving(true);
    const { error: saveError } = await supabase.rpc("save_employee_evaluation", {
      p_employee_id: selectedEmployeeId,
      p_reference_month: monthDate,
      p_general_comment: generalComment.trim() || null,
      p_answers: answers,
    });
    setSaving(false);

    if (saveError) {
      console.error("Erro ao salvar avaliação:", saveError);
      setError(saveError.message || "Não foi possível salvar a avaliação.");
      return;
    }

    setSuccess(`Avaliação de ${selectedEmployee?.full_name || "colaborador"} salva para ${monthLabel(monthValue)}.`);
    await loadMonthEvaluations();
  }

  function exportIndividualPdf(evaluation) {
    if (!evaluation) {
      setError("Salve a avaliação antes de gerar o relatório individual.");
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const employee = evaluation.employee || employees.find((item) => item.id === evaluation.employee_id);
    const avg = evaluationAverage(evaluation);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text("Nexo RH", 14, 18);
    doc.setFontSize(15);
    doc.text("Avaliação individual de desempenho", 14, 29);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Período: ${monthLabel(monthValue)}`, 14, 37);
    doc.text(`Colaborador: ${employee?.full_name || "Não identificado"}`, 14, 44);
    doc.text(`CPF: ${employee?.cpf || "Não informado"}`, 14, 50);
    doc.text(`Departamento: ${employee?.departments?.name || "Não informado"}`, 14, 56);
    doc.text(`Cargo: ${employee?.positions?.name || "Não informado"}`, 14, 62);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Média geral: ${averageLabel(avg)} / 10`, 14, 72);

    autoTable(doc, {
      startY: 79,
      head: [["Critério", "Questão avaliada", "Nota"]],
      body: CRITERIA.map((criterion) => {
        const answer = evaluation.answers.find((item) => item.criterion_key === criterion.key);
        return [criterion.title, criterion.question, answer ? `${answer.score}/10` : "—"];
      }),
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [100, 66, 231] },
      columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 119 }, 2: { cellWidth: 20, halign: "center" } },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc.lastAutoTable?.finalY || 130) + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Comentário geral", 14, finalY);
    doc.setFont("helvetica", "normal");
    const comment = evaluation.general_comment || "Nenhum comentário registrado.";
    const splitComment = doc.splitTextToSize(comment, 180);
    doc.text(splitComment, 14, finalY + 7);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Gerado em ${dateLabel(new Date().toISOString().slice(0, 10))}`, 14, 285);
    doc.save(`avaliacao-${fileToken(employee?.full_name)}-${monthValue}.pdf`);
  }

  function exportCompanyPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const [year, month] = monthValue.split("-").map(Number);
    const monthText = monthLabel(monthValue);
    const criterionAverages = CRITERIA.map((criterion) => {
      const criterionScores = evaluatedRows
        .map((row) => row.evaluation.answers.find((answer) => answer.criterion_key === criterion.key)?.score)
        .filter((value) => value !== undefined);
      return [criterion.title, criterionScores.length ? averageLabel(average(criterionScores)) : "—", `${criterionScores.length}/${employees.length}`];
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text("Nexo RH", 14, 16);
    doc.setFontSize(15);
    doc.text("Relatório geral de avaliações", 14, 27);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Período: ${monthText}`, 14, 35);
    doc.text(`Colaboradores cadastrados: ${employees.length}`, 14, 42);
    doc.text(`Avaliações concluídas: ${ratedEmployees}`, 14, 49);
    doc.text(`Cobertura: ${coverage}%`, 14, 56);
    doc.setFont("helvetica", "bold");
    doc.text(`Média geral da empresa: ${averageLabel(companyAverage)} / 10`, 14, 65);

    autoTable(doc, {
      startY: 72,
      head: [["Critério", "Média do critério", "Avaliações"]],
      body: criterionAverages,
      styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [100, 66, 231] },
      margin: { left: 14, right: 14 },
      tableWidth: 100,
    });

    const employeeBody = employeeRows.map((row) => [
      row.employee.full_name,
      row.employee.departments?.name || "—",
      row.employee.positions?.name || "—",
      row.evaluated ? `${averageLabel(row.average)} / 10` : "Não avaliado",
      row.evaluated ? row.evaluation.answers.length : "—",
    ]);
    const startY = Math.max((doc.lastAutoTable?.finalY || 72) + 8, 72);
    autoTable(doc, {
      startY,
      head: [["Colaborador", "Departamento", "Cargo", "Média individual", "Critérios respondidos"]],
      body: employeeBody.length ? employeeBody : [["Nenhum colaborador cadastrado", "—", "—", "—", "—"]],
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.5, overflow: "linebreak" },
      headStyles: { fillColor: [100, 66, 231] },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 38 }, 2: { cellWidth: 45 }, 3: { cellWidth: 35 }, 4: { cellWidth: 36 } },
      margin: { left: 14, right: 14 },
    });

    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Relatório gerado em ${dateLabel(new Date().toISOString().slice(0, 10))}`, 14, 202);
    doc.save(`relatorio-geral-avaliacoes-${year}-${pad(month)}.pdf`);
  }

  if (!loadingBase && !isAdmin) {
    return (
      <DashboardLayout>
        <main className="evaluation-page">
          <div className="evaluation-alert evaluation-alert--error">
            <AlertCircle size={18} />
            <span>{error || "Você não tem permissão para acessar as avaliações."}</span>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="evaluation-page">
        <header className="evaluation-header">
          <div>
            <div className="evaluation-eyebrow"><BarChart3 size={15} /> DESENVOLVIMENTO DE PESSOAS</div>
            <h1>Avaliação dos colaboradores</h1>
            <p>Registre as avaliações mensais e acompanhe os resultados da equipe.</p>
          </div>
          <div className="evaluation-header-actions">
            <label className="evaluation-month-field">
              <span>Mês de referência</span>
              <input type="month" value={monthValue} onChange={(event) => setMonthValue(event.target.value)} />
            </label>
            <button className="evaluation-refresh-button" type="button" disabled={refreshing || loadingBase} onClick={() => loadBase(true)}>
              <RefreshCw size={16} className={refreshing ? "evaluation-spin" : ""} /> Atualizar
            </button>
          </div>
        </header>

        {error && <div className="evaluation-alert evaluation-alert--error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
        {success && <div className="evaluation-alert evaluation-alert--success" role="status"><CheckCircle2 size={18} /><span>{success}</span><button type="button" onClick={() => setSuccess("")}>Fechar</button></div>}

        <section className="evaluation-overview-grid">
          <article className="evaluation-overview-card">
            <div className="evaluation-overview-icon"><UserRound size={19} /></div>
            <span>Colaboradores</span>
            <strong>{loadingBase ? "—" : employees.length}</strong>
            <small>Cadastros disponíveis para avaliação</small>
          </article>
          <article className="evaluation-overview-card">
            <div className="evaluation-overview-icon"><CheckCircle2 size={19} /></div>
            <span>Avaliações concluídas</span>
            <strong>{loadingEvaluations ? "—" : ratedEmployees}</strong>
            <small>De {employees.length} colaboradores</small>
          </article>
          <article className={`evaluation-overview-card ${companyAverage === null ? "" : companyAverage >= 7 ? "evaluation-card--good" : "evaluation-card--attention"}`}>
            <div className="evaluation-overview-icon"><Star size={19} /></div>
            <span>Média geral da empresa</span>
            <strong>{loadingEvaluations ? "—" : companyAverage === null ? "—" : `${averageLabel(companyAverage)}/10`}</strong>
            <small>{ratedEmployees ? `Cobertura de ${coverage}% no período` : "Ainda não há avaliações neste mês"}</small>
          </article>
        </section>

        <section className="evaluation-panel">
          <div className="evaluation-panel-heading">
            <div>
              <h2>Questionário mensal</h2>
              <p>Selecione o colaborador e atribua uma nota de 0 a 10 para cada critério.</p>
            </div>
            {selectedEvaluation && <span className="evaluation-saved-badge"><CheckCircle2 size={14} /> Avaliação salva</span>}
          </div>

          <form onSubmit={saveEvaluation}>
            <div className="evaluation-selection-row">
              <label className="evaluation-field evaluation-field--employee">
                <span>Colaborador avaliado</span>
                <select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)} disabled={loadingBase || !employees.length}>
                  {!employees.length && <option value="">Nenhum colaborador encontrado</option>}
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name}{employee.status !== "active" ? ` (${employee.status})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="evaluation-period-summary">
                <span>Período da avaliação</span>
                <strong>{monthLabel(monthValue)}</strong>
                <small>Uma avaliação por colaborador em cada mês</small>
              </div>
            </div>

            {selectedEmployee && (
              <div className="evaluation-employee-strip">
                <div className="evaluation-avatar">{selectedEmployee.full_name.trim().charAt(0).toUpperCase()}</div>
                <div>
                  <strong>{selectedEmployee.full_name}</strong>
                  <span>{selectedEmployee.departments?.name || "Departamento não informado"} · {selectedEmployee.positions?.name || "Cargo não informado"}</span>
                </div>
              </div>
            )}

            <div className="evaluation-criteria-list">
              {CRITERIA.map((criterion, index) => (
                <article className="evaluation-criterion" key={criterion.key}>
                  <div className="evaluation-criterion-number">{pad(index + 1)}</div>
                  <div className="evaluation-criterion-copy">
                    <h3>{criterion.title}</h3>
                    <p>{criterion.question}</p>
                  </div>
                  <label className="evaluation-score-field">
                    <span>Nota</span>
                    <select
                      aria-label={`Nota de ${criterion.title}`}
                      value={scores[criterion.key]}
                      onChange={(event) => updateScore(criterion.key, event.target.value)}
                      required
                    >
                      <option value="">—</option>
                      {Array.from({ length: 11 }, (_, score) => (
                        <option key={score} value={score}>{score}</option>
                      ))}
                    </select>
                    <small>/ 10</small>
                  </label>
                </article>
              ))}
            </div>

            <label className="evaluation-field evaluation-comment-field">
              <span>Comentário geral (opcional)</span>
              <textarea
                rows={4}
                maxLength={3000}
                value={generalComment}
                onChange={(event) => setGeneralComment(event.target.value)}
                placeholder="Registre observações, pontos fortes e oportunidades de desenvolvimento."
              />
              <small>{generalComment.length}/3000 caracteres</small>
            </label>

            <div className="evaluation-form-footer">
              <div className="evaluation-average-preview">
                <span>Média desta avaliação</span>
                <strong>{averageLabel(average(CRITERIA.filter((criterion) => scores[criterion.key] !== "").map((criterion) => scores[criterion.key])))}
                  <small>/ 10</small>
                </strong>
              </div>
              <div className="evaluation-form-actions">
                {selectedEvaluation && (
                  <button type="button" className="evaluation-outline-button" onClick={() => exportIndividualPdf(selectedEvaluation)}>
                    <Download size={16} /> PDF individual
                  </button>
                )}
                <button type="submit" className="evaluation-primary-button" disabled={saving || loadingBase || !selectedEmployeeId}>
                  <Save size={16} /> {saving ? "Salvando..." : selectedEvaluation ? "Atualizar avaliação" : "Salvar avaliação"}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className="evaluation-panel">
          <div className="evaluation-panel-heading">
            <div>
              <h2>Resultados do mês</h2>
              <p>Médias individuais e visão consolidada de {monthLabel(monthValue)}.</p>
            </div>
            <button type="button" className="evaluation-primary-button" onClick={exportCompanyPdf} disabled={loadingEvaluations || employees.length === 0}>
              <Download size={16} /> Relatório geral em PDF
            </button>
          </div>

          {loadingEvaluations ? (
            <div className="evaluation-empty"><RefreshCw size={20} className="evaluation-spin" />Carregando resultados...</div>
          ) : (
            <div className="evaluation-results-table-wrap">
              <table className="evaluation-results-table">
                <thead>
                  <tr><th>Colaborador</th><th>Departamento</th><th>Média</th><th>Critérios respondidos</th><th>Última atualização</th><th>Relatório</th></tr>
                </thead>
                <tbody>
                  {employeeRows.map(({ employee, evaluation, average: employeeAverage, evaluated }) => (
                    <tr key={employee.id}>
                      <td>
                        <button type="button" className="evaluation-employee-link" onClick={() => setSelectedEmployeeId(employee.id)}>
                          <span className="evaluation-mini-avatar">{employee.full_name.trim().charAt(0).toUpperCase()}</span>
                          <span>{employee.full_name}</span>
                        </button>
                      </td>
                      <td>{employee.departments?.name || "—"}</td>
                      <td>
                        {evaluated
                          ? <span className={`evaluation-grade ${employeeAverage >= 7 ? "evaluation-grade--good" : employeeAverage >= 5 ? "evaluation-grade--mid" : "evaluation-grade--low"}`}>{averageLabel(employeeAverage)}/10</span>
                          : <span className="evaluation-not-rated">Não avaliado</span>}
                      </td>
                      <td>{evaluated ? `${evaluation.answers.length}/7` : "—"}</td>
                      <td>{evaluated ? dateLabel(evaluation.updated_at || evaluation.created_at) : "—"}</td>
                      <td>
                        {evaluation
                          ? <button type="button" className="evaluation-row-pdf" onClick={() => exportIndividualPdf(evaluation)} title="Baixar avaliação individual em PDF"><FileText size={16} /> PDF</button>
                          : <span className="evaluation-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                  {!employeeRows.length && <tr><td colSpan={6} className="evaluation-table-empty">Nenhum colaborador cadastrado.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="evaluation-footer">
          <span>Avaliação de colaboradores · Nexo RH</span>
          <span>Notas de 0 a 10 · Referência mensal</span>
        </footer>
      </main>
    </DashboardLayout>
  );
}
