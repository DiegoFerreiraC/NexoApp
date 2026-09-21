import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Edit3,
  LoaderCircle,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";

import { supabase } from "../services/supabase";

import DashboardLayout from "../components/DashboardLayout";

import "../styles/employees.css";

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

function EmployeeProfile() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [formData, setFormData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadEmployee() {
      const [employeeResult, departmentsResult, positionsResult] = await Promise.all([
        supabase
          .from("employees")
          .select("*, departments(name), positions(name)")
          .eq("id", employeeId)
          .single(),
        supabase
          .from("departments")
          .select("id, name")
          .order("name"),
        supabase
          .from("positions")
          .select("id, name")
          .order("name"),
      ]);

      if (employeeResult.error || !employeeResult.data) {
        setError("Não foi possível carregar este colaborador.");
      } else {
        const currentEmployee = employeeResult.data;

        setEmployee(currentEmployee);
        setFormData({
          full_name: currentEmployee.full_name,
          cpf: formatCpf(currentEmployee.cpf),
          email: currentEmployee.email,
          phone: currentEmployee.phone ? formatPhone(currentEmployee.phone) : "",
          birth_date: currentEmployee.birth_date || "",
          hire_date: currentEmployee.hire_date,
          department_id: currentEmployee.department_id || "",
          position_id: currentEmployee.position_id || "",
          salary: currentEmployee.salary || "",
          status: currentEmployee.status,
        });
      }

      setDepartments(departmentsResult.data || []);
      setPositions(positionsResult.data || []);
      setLoading(false);
    }

    loadEmployee();
  }, [employeeId]);

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

  function cancelEditing() {
    setFormData({
      full_name: employee.full_name,
      cpf: formatCpf(employee.cpf),
      email: employee.email,
      phone: employee.phone ? formatPhone(employee.phone) : "",
      birth_date: employee.birth_date || "",
      hire_date: employee.hire_date,
      department_id: employee.department_id || "",
      position_id: employee.position_id || "",
      salary: employee.salary || "",
      status: employee.status,
    });

    setEditing(false);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const { data, error: updateError } = await supabase
      .from("employees")
      .update({
        full_name: formData.full_name.trim(),
        cpf: formData.cpf.replace(/\D/g, ""),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone || null,
        birth_date: formData.birth_date || null,
        hire_date: formData.hire_date,
        department_id: formData.department_id || null,
        position_id: formData.position_id || null,
        salary: formData.salary === "" ? null : Number(formData.salary),
        status: formData.status,
      })
      .eq("id", employeeId)
      .select("*, departments(name), positions(name)")
      .single();

    if (updateError) {
      setError("Não foi possível salvar as alterações.");
      setSaving(false);

      return;
    }

    setEmployee(data);
    setEditing(false);
    setSaving(false);
    setSuccess("Dados atualizados com sucesso.");
  }

  if (loading) {
    return (
      <DashboardLayout>
        <main className="employee-page employee-page-center">
          <LoaderCircle className="employee-spinner" size={28} />
        </main>
      </DashboardLayout>
    );
  }

  if (!employee || !formData) {
    return (
      <DashboardLayout>
        <main className="employee-page employee-page-center">
          <div className="employee-not-found">
          <h1>Colaborador não encontrado</h1>
          <p>{error}</p>
          <button
            className="employee-primary-button"
            type="button"
            onClick={() => navigate("/colaboradores")}
          >
            Voltar para a lista
          </button>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="employee-page">
        <section className="employee-registration">
        <button
          className="employee-back-button"
          type="button"
          onClick={() => navigate("/colaboradores")}
        >
          <ArrowLeft size={19} />

          Lista de funcionários
        </button>

        <header className="employee-profile-header">
          <div className="employee-profile-avatar">
            {employee.full_name.charAt(0).toUpperCase()}
          </div>

          <div className="employee-profile-title">
            <p className="employee-kicker">Perfil do colaborador</p>
            <h1>{employee.full_name}</h1>
            <span className={`employee-status employee-status-${employee.status}`}>
              {employee.status === "active" ? "Ativo" : employee.status}
            </span>
          </div>

          {!editing && (
            <button
              className="employee-primary-button"
              type="button"
              onClick={() => setEditing(true)}
            >
              <Edit3 size={18} />

              Editar dados
            </button>
          )}
        </header>

        {success && (
          <p className="employee-success-message" role="status">
            <Check size={18} />
            {success}
          </p>
        )}

        {editing ? (
          <form onSubmit={handleSubmit}>
            <section className="employee-form-section">
              <div className="employee-form-heading">
                <h2>Editar informações</h2>
                <p>Atualize os dados necessários e salve as alterações.</p>
              </div>

              <div className="employee-form-grid">
                <label className="employee-field employee-field-wide">
                  <span>Nome completo *</span>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
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
                  <span>E-mail *</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
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
                  />
                </label>

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
                  >
                    <option value="">Selecione um departamento</option>
                    {departments.map((department) => (
                      <option
                        key={department.id}
                        value={department.id}
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
                  >
                    <option value="">Selecione um cargo</option>
                    {positions.map((position) => (
                      <option
                        key={position.id}
                        value={position.id}
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
                    min="0"
                    step="0.01"
                  />
                </label>

                <label className="employee-field">
                  <span>Status</span>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
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
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                className="employee-primary-button"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircle
                    className="employee-spinner"
                    size={18}
                  />
                ) : (
                  <Check size={18} />
                )}

                {saving
                  ? "Salvando..."
                  : "Salvar alterações"}
              </button>
            </div>
          </form>
        ) : (
          <section className="employee-details-grid">
            <article className="employee-details-card">
              <UserRound size={21} />
              <div>
                <span>CPF</span>
                <strong>{formatCpf(employee.cpf)}</strong>
              </div>
            </article>
            <article className="employee-details-card">
              <Mail size={21} />
              <div>
                <span>E-mail</span>
                <strong>{employee.email}</strong>
              </div>
            </article>
            <article className="employee-details-card">
              <Phone size={21} />
              <div>
                <span>Telefone</span>
                <strong>{employee.phone || "Não informado"}</strong>
              </div>
            </article>
            <article className="employee-details-card">
              <CalendarDays size={21} />
              <div>
                <span>Admissão</span>
                <strong>
                  {new Date(
                    `${employee.hire_date}T00:00:00`
                  ).toLocaleDateString("pt-BR")}
                </strong>
              </div>
            </article>
            <article className="employee-details-card">
              <BriefcaseBusiness size={21} />
              <div>
                <span>Departamento</span>
                <strong>
                  {employee.departments?.name || "Não informado"}
                </strong>
              </div>
            </article>
            <article className="employee-details-card">
              <BriefcaseBusiness size={21} />
              <div>
                <span>Cargo</span>
                <strong>
                  {employee.positions?.name || "Não informado"}
                </strong>
              </div>
            </article>
          </section>
        )}
        </section>
      </main>
    </DashboardLayout>
  );
}

export default EmployeeProfile;
