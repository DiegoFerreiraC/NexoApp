import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import FirstAccess from "./pages/FirstAccess";
import Dashboard from "./pages/Dashboard";
import EmployeeRegistration from "./pages/EmployeeRegistration";
import EmployeesList from "./pages/EmployeesList";
import EmployeeProfile from "./pages/EmployeeProfile";
import AuthGuard from "./components/AuthGuard";
import Vacations from "./pages/Vacations";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/primeiro-acesso" element={<FirstAccess />} />

        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />

        <Route
          path="/colaboradores"
          element={
            <AuthGuard>
              <EmployeesList />
            </AuthGuard>
          }
        />

        <Route
          path="/colaboradores/cadastro"
          element={
            <AuthGuard>
              <EmployeeRegistration />
            </AuthGuard>
          }
        />

        <Route
          path="/colaboradores/:employeeId"
          element={
            <AuthGuard>
              <EmployeeProfile />
            </AuthGuard>
          }
        />
        <Route
          path="/ferias"
          element={
            <AuthGuard>
              <Vacations />
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
