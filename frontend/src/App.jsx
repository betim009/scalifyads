import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Configuracoes from "./pages/Configuracoes.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Financeiro from "./pages/Financeiro.jsx";
import Mensal from "./pages/Mensal.jsx";
import NovaCampanha from "./pages/NovaCampanha.jsx";
import RoiOntem from "./pages/RoiOntem.jsx";
import RoiOperacional from "./pages/RoiOperacional.jsx";
import CampanhaDetalhes from "./pages/CampanhaDetalhes.jsx";
import CampanhaDuplicar from "./pages/CampanhaDuplicar.jsx";
import MetaPausedTest from "./pages/MetaPausedTest.jsx";
import CampaignFlow from "./pages/CampaignFlow.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Profile from "./pages/Profile.jsx";
import Logout from "./pages/Logout.jsx";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade.jsx";
import TermosDeUso from "./pages/TermosDeUso.jsx";
import ExclusaoDados from "./pages/ExclusaoDados.jsx";
import Templates from "./pages/Templates.jsx";
import TemplatesMercado from "./pages/TemplatesMercado.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/mensal"
          element={
            <RequireAuth>
              <Mensal />
            </RequireAuth>
          }
        />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route
          path="/nova-campanha"
          element={
            <RequireAuth>
              <NovaCampanha />
            </RequireAuth>
          }
        />
        <Route
          path="/roi-ontem"
          element={
            <RequireAuth>
              <RoiOntem />
            </RequireAuth>
          }
        />
        <Route
          path="/roi-operacional"
          element={
            <RequireAuth>
              <RoiOperacional />
            </RequireAuth>
          }
        />
        <Route
          path="/campanhas/:id"
          element={
            <RequireAuth>
              <CampanhaDetalhes />
            </RequireAuth>
          }
        />
        <Route
          path="/campanhas/:id/duplicar"
          element={
            <RequireAuth>
              <CampanhaDuplicar />
            </RequireAuth>
          }
        />
        <Route
          path="/financeiro"
          element={
            <RequireAuth>
              <Financeiro />
            </RequireAuth>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <RequireAuth>
              <Configuracoes />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route
          path="/logout"
          element={
            <RequireAuth>
              <Logout />
            </RequireAuth>
          }
        />
        <Route
          path="/meta-test"
          element={
            <RequireAuth>
              <MetaPausedTest />
            </RequireAuth>
          }
        />
        <Route
          path="/campaign-flow"
          element={
            <RequireAuth>
              <CampaignFlow />
            </RequireAuth>
          }
        />
        <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/termos-de-uso" element={<TermosDeUso />} />
        <Route path="/exclusao-de-dados" element={<ExclusaoDados />} />
        <Route
          path="/templates"
          element={
            <RequireAuth>
              <Templates />
            </RequireAuth>
          }
        />
        <Route
          path="/templates-mercado"
          element={
            <RequireAuth>
              <TemplatesMercado />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
