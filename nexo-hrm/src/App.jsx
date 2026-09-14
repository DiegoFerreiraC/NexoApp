import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import FirstAccess from "./pages/FirstAccess";
import Dashboard from "./pages/Dashboard";
import AuthGuard from "./components/AuthGuard";

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;