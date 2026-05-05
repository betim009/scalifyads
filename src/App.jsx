import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Configuracoes from "./pages/Configuracoes.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Financeiro from "./pages/Financeiro.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
