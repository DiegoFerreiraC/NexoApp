import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { supabase } from "../services/supabase";

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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

  return (
    <div>
      <h1>Nexo HRM</h1>

      <h2>Dashboard</h2>

      <p>Bem-vindo ao Nexo HRM.</p>

      <div>
        <button>Funcionários</button>
        <button>Férias</button>
        <button>Folha</button>
      </div>

      <button
        onClick={handleLogout}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginTop: "30px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        <LogOut size={18} />

        {loading ? "Saindo..." : "Sair"}
      </button>
    </div>
  );
}

export default Dashboard;