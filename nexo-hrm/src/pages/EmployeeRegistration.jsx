import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  BadgeCheck,
  Copy,
  KeyRound,
  LoaderCircle,
  UserPlus,
} from "lucide-react";

import { supabase } from "../services/supabase";

import DashboardLayout from "../components/DashboardLayout";

import "../styles/employees.css";

const initialFormData = {
  full_name: "",
  cpf: "",
  email: "",
  phone: "",
  birth_date: "",
  hire_date: "",
  department_id: "",
  position_id: "",
  salary: "",
};

function formatCpf(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function EmployeeRegistration() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormData);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      const [departmentsResult, positionsResult] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name")
          .order("name"),
        supabase
          .from("positions")
          .select("id, name")
          .order("name"),
      ]);

      if (departmentsResult.error || positionsResult.error) {
        setError(
          "Não foi possível carregar departamentos e cargos. Tente novamente."
        );
      } else {
        setDepartments(departmentsResult.data);
        setPositions(positionsResult.data);
      }

      setLoadingOptions(false);
    }

    loadOptions();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    const formattedValue = name === "cpf"
      ? formatCpf(value)
      : name === "phone"
        ? formatPhone(value)
        : value;

    setFormData({
      ...formData,
      [name]: formattedValue,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const { data, error: functionError } = await supabase.functions.invoke(
      "create-employee",
      {
        body: formData,
      }
    );

    if (functionError) {
      setError(
        "Não foi possível concluir o cadastro. Verifique os dados e tente novamente."
      );
      setLoading(false);

      return;
    }

    if (!data?.temporary_password) {
      setError("A senha temporária não foi retornada pelo servidor.");
      setLoading(false);

      return;
    }

    setTemporaryPassword(data.temporary_password);
    setLoading(false);
  }

  async function copyTemporaryPassword() {
    await navigator.clipboard.writeText(temporaryPassword);

    setCopied(true);
  }

  if (temporaryPassword) {
    return (
      <DashboardLayout>
        <main className="employee-page">
        <section className="employee-success-card">
          <div className="employee-success-icon">
            <BadgeCheck size={42} />
          </div>

          <p className="employee-kicker">Cadastro concluído</p>

          <h1>Colaborador cadastrado com sucesso!</h1>

          <p>
            Entregue esta senha pessoalmente ao colaborador. Ela será exibida somente agora e deverá ser alterada no primeiro acesso.
          </p>

          <div className="temporary-password-box">
            <div>
              <span>Senha temporária</span>
              <strong>{temporaryPassword}</strong>
            </div>

            <button
              type="button"
              onClick={copyTemporaryPassword}
            >
              <Copy size={18} />

              {copied ? "Copiada" : "Copiar"}
            </button>
          </div>

          <div className="employee-success-actions">
            <button
              className="employee-secondary-button"
              type="button"
              onClick={() => {
                setFormData(initialFormData);
                setTemporaryPassword("");
                setCopied(false);
              }}
            >
              Cadastrar outro colaborador
            </button>

            <button
              className="employee-primary-button"
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              Voltar ao dashboard
            </button>
          </div>
        </section>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="employee-page">
      <section className="employee-registration">
        <header className="employee-page-header">
          <button
            className="employee-back-button"
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={19} />

            Dashboard
          </button>

          <div className="employee-page-title">
            <div className="employee-title-icon">
              <UserPlus size={24} />
            </div>

            <div>
              <p className="employee-kicker">Colaboradores</p>
              <h1>Novo colaborador</h1>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <section className="employee-form-section">
            <div className="employee-form-heading">
              <h2>Dados pessoais</h2>
              <p>Informações de identificação e contato.</p>
            </div>

            <div className="employee-form-grid">
              <label className="employee-field employee-field-wide">
                <span>Nome completo *</span>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Digite o nome completo"
                  autoComplete="name"
                  required
                />
              </label>

              <label className="employee-field">
                <span>CPF *</span>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  required
                />
              </label>

              <label className="employee-field">
                <span>Data de nascimento</span>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleChange}
                />
              </label>

              <label className="employee-field">
                <span>E-mail corporativo *</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="nome@empresa.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="employee-field">
                <span>Telefone</span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  autoComplete="tel"
                />
              </label>
            </div>
          </section>

          <section className="employee-form-section">
            <div className="employee-form-heading">
              <h2>Dados profissionais</h2>
              <p>Vínculo e posição do colaborador na empresa.</p>
            </div>

            <div className="employee-form-grid">
              <label className="employee-field">
                <span>Data de admissão *</span>
                <input
                  type="date"
                  name="hire_date"
                  value={formData.hire_date}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="employee-field">
                <span>Departamento</span>
                <select
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleChange}
                  disabled={loadingOptions}
                >
                  <option value="">Selecione um departamento</option>
                  {departments.map((department) => (
                    <option
                      value={department.id}
                      key={department.id}
                    >
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="employee-field">
                <span>Cargo</span>
                <select
                  name="position_id"
                  value={formData.position_id}
                  onChange={handleChange}
                  disabled={loadingOptions}
                >
                  <option value="">Selecione um cargo</option>
                  {positions.map((position) => (
                    <option
                      value={position.id}
                      key={position.id}
                    >
                      {position.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="employee-field">
                <span>Salário base</span>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                />
              </label>
            </div>
          </section>

          {error && (
            <p className="employee-error" role="alert">
              {error}
            </p>
          )}

          <div className="employee-form-actions">
            <button
              className="employee-secondary-button"
              type="button"
              onClick={() => navigate("/dashboard")}
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              className="employee-primary-button"
              type="submit"
              disabled={loading || loadingOptions}
            >
              {loading ? (
                <LoaderCircle className="employee-spinner" size={18} />
              ) : (
                <KeyRound size={18} />
              )}

              {loading
                ? "Criando acesso..."
                : "Cadastrar e gerar acesso"}
            </button>
          </div>
        </form>
      </section>
      </main>
    </DashboardLayout>
  );
}

export default EmployeeRegistration;
