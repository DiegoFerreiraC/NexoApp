import { useEffect, useState } from "react";
import { Search, FileText, ChevronRight } from "lucide-react";
import { supabase } from "../services/supabase";
import DashboardLayout from "../components/DashboardLayout";
import "../styles/payroll.css";

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatMonth(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(`${date}T12:00:00`)
  );
}

function getStatusLabel(status) {
  const labels = {
    pending: "Pendente",
    paid: "Pago",
    cancelled: "Cancelado",
  };

  return labels[status] || status;
}

function getStatusClass(status) {
  if (status === "paid") return "payroll-status payroll-status-paid";
  if (status === "cancelled") {
    return "payroll-status payroll-status-cancelled";
  }

  return "payroll-status payroll-status-pending";
}

function Payroll() {
  const [profile, setProfile] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      loadPayrolls();
    }
  }, [profile]);

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

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, employee_id, role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      setError("Não foi possível carregar o perfil.");
      setLoading(false);
      return;
    }

    setProfile(data);
  }

  async function loadPayrolls() {
    setLoading(true);
    setError("");

    const isHrOrAdmin =
      profile.role === "hr" || profile.role === "admin";

    let query = supabase
      .from("payrolls")
      .select(
        `
          id,
          employee_id,
          reference_month,
          base_salary,
          gross_salary,
          total_deductions,
          net_salary,
          payment_date,
          status,
          employees (
            full_name,
            email
          )
        `
      )
      .order("reference_month", { ascending: false });

    if (!isHrOrAdmin) {
      query = query.eq("employee_id", profile.employee_id);
    }

    const { data, error: payrollError } = await query;

    if (payrollError) {
      setError("Não foi possível carregar as folhas de pagamento.");
      setPayrolls([]);
      setLoading(false);
      return;
    }

    setPayrolls(data || []);
    setLoading(false);
  }

  async function openPayroll(payroll) {
    setSelectedPayroll(payroll);
    setItems([]);
    setDetailsLoading(true);
    setError("");

    const { data, error: itemsError } = await supabase
      .from("payroll_items")
      .select("id, type, description, amount")
      .eq("payroll_id", payroll.id)
      .order("type")
      .order("created_at");

    if (itemsError) {
      setError("Não foi possível carregar os itens do holerite.");
      setDetailsLoading(false);
      return;
    }

    setItems(data || []);
    setDetailsLoading(false);
  }

  function closePayroll() {
    setSelectedPayroll(null);
    setItems([]);
  }

  const filteredPayrolls = payrolls.filter((payroll) => {
    if (!search.trim()) return true;

    const term = search.toLowerCase();

    return (
      payroll.employees?.full_name?.toLowerCase().includes(term) ||
      payroll.employees?.email?.toLowerCase().includes(term)
    );
  });

  const isHrOrAdmin =
    profile?.role === "hr" || profile?.role === "admin";

  const earnings = items.filter((item) => item.type === "earning");
  const deductions = items.filter((item) => item.type === "deduction");

  return (
    <DashboardLayout>
      <main className="payroll-page">
        <div className="payroll-container">
          <header className="payroll-header">
            <div>
              <p className="payroll-kicker">Gestão financeira</p>

              <h1>
                {isHrOrAdmin
                  ? "Folha de pagamento"
                  : "Minha folha de pagamento"}
              </h1>

              <p>
                {isHrOrAdmin
                  ? "Consulte as folhas e os holerites dos colaboradores."
                  : "Consulte suas folhas de pagamento e holerites."}
              </p>
            </div>
          </header>

          {error && (
            <div className="payroll-message payroll-message-error">
              {error}
            </div>
          )}

          {!selectedPayroll && (
            <>
              {isHrOrAdmin && (
                <div className="payroll-toolbar">
                  <div className="payroll-search">
                    <Search size={18} />

                    <input
                      type="search"
                      placeholder="Buscar colaborador..."
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              {loading ? (
                <div className="payroll-empty">
                  Carregando folhas...
                </div>
              ) : filteredPayrolls.length === 0 ? (
                <div className="payroll-empty">
                  <FileText size={40} strokeWidth={1.5} />

                  <strong>
                    Nenhuma folha encontrada
                  </strong>

                  <span>
                    Ainda não existem folhas disponíveis para consulta.
                  </span>
                </div>
              ) : (
                <section className="payroll-list">
                  {filteredPayrolls.map((payroll) => (
                    <button
                      type="button"
                      className="payroll-card"
                      key={payroll.id}
                      onClick={() => openPayroll(payroll)}
                    >
                      <div className="payroll-card-icon">
                        <FileText
                          size={22}
                          strokeWidth={1.8}
                        />
                      </div>

                      <div className="payroll-card-main">
                        <strong>
                          {isHrOrAdmin
                            ? payroll.employees?.full_name
                            : formatMonth(
                                payroll.reference_month
                              )}
                        </strong>

                        <span>
                          {isHrOrAdmin
                            ? formatMonth(
                                payroll.reference_month
                              )
                            : `Pagamento em ${
                                formatDate(
                                  payroll.payment_date
                                )
                              }`}
                        </span>
                      </div>

                      <div className="payroll-card-values">
                        <span>Líquido</span>

                        <strong>
                          {formatCurrency(
                            payroll.net_salary
                          )}
                        </strong>
                      </div>

                      <span
                        className={getStatusClass(
                          payroll.status
                        )}
                      >
                        {getStatusLabel(payroll.status)}
                      </span>

                      <ChevronRight
                        size={21}
                        className="payroll-card-arrow"
                      />
                    </button>
                  ))}
                </section>
              )}
            </>
          )}

          {selectedPayroll && (
            <section className="payroll-detail">
              <button
                type="button"
                className="payroll-back-button"
                onClick={closePayroll}
              >
                ← Voltar para a folha
              </button>

              <div className="payroll-slip">
                <div className="payroll-slip-header">
                  <div>
                    <p className="payroll-kicker">
                      Holerite
                    </p>

                    <h2>
                      {formatMonth(
                        selectedPayroll.reference_month
                      )}
                    </h2>

                    {isHrOrAdmin && (
                      <p>
                        {selectedPayroll.employees?.full_name}
                      </p>
                    )}
                  </div>

                  <span
                    className={getStatusClass(
                      selectedPayroll.status
                    )}
                  >
                    {getStatusLabel(
                      selectedPayroll.status
                    )}
                  </span>
                </div>

                <div className="payroll-summary">
                  <div>
                    <span>Salário base</span>
                    <strong>
                      {formatCurrency(
                        selectedPayroll.base_salary
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Salário bruto</span>
                    <strong>
                      {formatCurrency(
                        selectedPayroll.gross_salary
                      )}
                    </strong>
                  </div>

                  <div className="payroll-net">
                    <span>Salário líquido</span>
                    <strong>
                      {formatCurrency(
                        selectedPayroll.net_salary
                      )}
                    </strong>
                  </div>
                </div>

                {detailsLoading ? (
                  <div className="payroll-empty">
                    Carregando detalhes...
                  </div>
                ) : (
                  <div className="payroll-items">
                    <div className="payroll-items-section">
                      <div className="payroll-items-heading">
                        <h3>Proventos</h3>

                        <span>
                          {formatCurrency(
                            earnings.reduce(
                              (total, item) =>
                                total +
                                Number(item.amount || 0),
                              0
                            )
                          )}
                        </span>
                      </div>

                      {earnings.length === 0 ? (
                        <p className="payroll-no-items">
                          Nenhum provento informado.
                        </p>
                      ) : (
                        earnings.map((item) => (
                          <div
                            className="payroll-item"
                            key={item.id}
                          >
                            <span>
                              {item.description}
                            </span>

                            <strong>
                              {formatCurrency(
                                item.amount
                              )}
                            </strong>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="payroll-items-section">
                      <div className="payroll-items-heading">
                        <h3>Descontos</h3>

                        <span>
                          {formatCurrency(
                            deductions.reduce(
                              (total, item) =>
                                total +
                                Number(item.amount || 0),
                              0
                            )
                          )}
                        </span>
                      </div>

                      {deductions.length === 0 ? (
                        <p className="payroll-no-items">
                          Nenhum desconto informado.
                        </p>
                      ) : (
                        deductions.map((item) => (
                          <div
                            className="payroll-item"
                            key={item.id}
                          >
                            <span>
                              {item.description}
                            </span>

                            <strong>
                              {formatCurrency(
                                item.amount
                              )}
                            </strong>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="payroll-totals">
                  <div>
                    <span>Total de proventos</span>
                    <strong>
                      {formatCurrency(
                        selectedPayroll.gross_salary
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Total de descontos</span>
                    <strong>
                      {formatCurrency(
                        selectedPayroll.total_deductions
                      )}
                    </strong>
                  </div>

                  <div className="payroll-total-net">
                    <span>Valor líquido</span>
                    <strong>
                      {formatCurrency(
                        selectedPayroll.net_salary
                      )}
                    </strong>
                  </div>
                </div>

                <div className="payroll-payment-info">
                  <span>
                    Data de pagamento
                  </span>

                  <strong>
                    {formatDate(
                      selectedPayroll.payment_date
                    )}
                  </strong>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}

export default Payroll;