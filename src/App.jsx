import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Configuracoes from "./pages/Configuracoes.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Financeiro from "./pages/Financeiro.jsx";
import Mensal from "./pages/Mensal.jsx";
import NovaCampanha from "./pages/NovaCampanha.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/mensal" replace />} />
        <Route path="/mensal" element={<Mensal />} />
        <Route path="/dashboard" element={<Navigate to="/mensal" replace />} />
        <Route path="/nova-campanha" element={<NovaCampanha />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
