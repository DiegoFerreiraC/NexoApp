import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { supabase } from "../services/supabase";

import DashboardLayout from "../components/DashboardLayout";

import "../styles/employees.css";

const employeesPerPage = 10;

function EmployeesList() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError("");

      const start = page * employeesPerPage;
      const end = start + employeesPerPage - 1;

      let query = supabase
        .from("employees")
        .select(
          "id, full_name, email, phone, hire_date, status, departments(name), positions(name)",
          { count: "exact" }
        )
        .order("full_name")
        .range(start, end);

      if (search.trim()) {
        query = query.ilike(
          "full_name",
          `%${search.trim()}%`
        );
      }

      const { data, error: employeesError, count } = await query;

      if (ignore) {
        return;
      }

      if (employeesError) {
        setError("Não foi possível carregar os colaboradores.");
        setEmployees([]);
        setTotalEmployees(0);
      } else {
        setEmployees(data);
        setTotalEmployees(count || 0);
      }

      setLoading(false);
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
    };
  }, [page, search]);

  const totalPages = Math.ceil(totalEmployees / employeesPerPage);

  function handleSearch(event) {
    setSearch(event.target.value);
    setPage(0);
  }

  return (
    <DashboardLayout>
      <main className="employee-page">
        <section className="employee-list-page">
        <header className="employee-page-header employee-list-header">
          <div>
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
                <UsersRound size={24} />
              </div>

              <div>
                <p className="employee-kicker">Colaboradores</p>
                <h1>Lista de funcionários</h1>
              </div>
            </div>
          </div>

          <button
            className="employee-primary-button"
            type="button"
            onClick={() => navigate("/colaboradores/cadastro")}
          >
            <UserPlus size={18} />

            Novo colaborador
          </button>
        </header>

        <section className="employee-list-card">
          <div className="employee-list-toolbar">
            <div>
              <h2>Funcionários cadastrados</h2>
              <p>
                {totalEmployees} {totalEmployees === 1 ? "colaborador encontrado" : "colaboradores encontrados"}
              </p>
            </div>

            <label className="employee-search">
              <Search size={19} />

              <input
                type="search"
                value={search}
                onChange={handleSearch}
                placeholder="Buscar por nome"
              />
            </label>
          </div>

          {loading && (
            <div className="employee-loading">
              <LoaderCircle className="employee-spinner" size={24} />

              Carregando colaboradores...
            </div>
          )}

          {!loading && error && (
            <p className="employee-error" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && employees.length === 0 && (
            <div className="employee-empty-state">
              <UsersRound size={36} />

              <h2>Nenhum colaborador encontrado</h2>

              <p>
                {search
                  ? "Tente buscar por outro nome."
                  : "Comece cadastrando o primeiro colaborador."}
              </p>
            </div>
          )}

          {!loading && !error && employees.length > 0 && (
            <div className="employee-list">
              {employees.map((employee) => (
                <button
                  className="employee-list-item"
                  type="button"
                  key={employee.id}
                  onClick={() =>
                    navigate(`/colaboradores/${employee.id}`)
                  }
                >
                  <span className="employee-list-avatar">
                    {employee.full_name.charAt(0).toUpperCase()}
                  </span>

                  <span className="employee-list-main">
                    <strong>{employee.full_name}</strong>
                    <small>{employee.email}</small>
                  </span>

                  <span className="employee-list-meta">
                    <small>Departamento</small>
                    <strong>
                      {employee.departments?.name || "Não informado"}
                    </strong>
                  </span>

                  <span className="employee-list-meta">
                    <small>Cargo</small>
                    <strong>
                      {employee.positions?.name || "Não informado"}
                    </strong>
                  </span>

                  <span
                    className={`employee-status employee-status-${employee.status}`}
                  >
                    {employee.status === "active" ? "Ativo" : employee.status}
                  </span>

                  <ChevronRight className="employee-list-arrow" size={20} />
                </button>
              ))}
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="employee-pagination">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                aria-label="Página anterior"
              >
                <ChevronLeft size={18} />
              </button>

              <span>
                Página {page + 1} de {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page + 1 >= totalPages}
                aria-label="Próxima página"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </section>
        </section>
      </main>
    </DashboardLayout>
  );
}

export default EmployeesList;
