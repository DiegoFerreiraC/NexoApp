import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import FirstAccess from "./pages/FirstAccess";
import Dashboard from "./pages/Dashboard";
import EmployeeRegistration from "./pages/manager/EmployeeRegistration";
import EmployeesList from "./pages/manager/EmployeesList";
import EmployeeProfile from "./pages/manager/EmployeeProfile";
import AuthGuard from "./components/AuthGuard";
import Vacations from "./pages/Vacations";
import Payroll from "./pages/Payroll";
import MyProfile from "./pages/employee/MyProfile";
import TimeClock from "./pages/employee/TimeClock";
import TimeClockManagement from "./pages/manager/TimeClockManagement";
import Evaluations from "./pages/manager/Evaluations";

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
        <Route
          path="/folha"
          element={
            <AuthGuard>
              <Payroll />
            </AuthGuard>
          }
        />
        <Route
          path="/perfil"
          element={
            <AuthGuard>
              <MyProfile />
            </AuthGuard>
          }
        />
        <Route
          path="/ponto"
          element={
            <AuthGuard>
              <TimeClock />
            </AuthGuard>
          }
        />
        <Route
          path="/gestao-ponto"
          element={
            <AuthGuard>
              <TimeClockManagement />
            </AuthGuard>
          }
        />
        <Route
          path="/avaliacoes"
          element={
            <AuthGuard>
              <Evaluations />
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
