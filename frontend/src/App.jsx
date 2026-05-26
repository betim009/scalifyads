import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Configuracoes from "./pages/Configuracoes.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Financeiro from "./pages/Financeiro.jsx";
import Mensal from "./pages/Mensal.jsx";
import NovaCampanha from "./pages/NovaCampanha.jsx";
import RoiOntem from "./pages/RoiOntem.jsx";
import CampanhaDetalhes from "./pages/CampanhaDetalhes.jsx";
import CampanhaDuplicar from "./pages/CampanhaDuplicar.jsx";
import MetaPausedTest from "./pages/MetaPausedTest.jsx";
import CampaignFlow from "./pages/CampaignFlow.jsx";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade.jsx";
import TermosDeUso from "./pages/TermosDeUso.jsx";
import ExclusaoDados from "./pages/ExclusaoDados.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/mensal" element={<Mensal />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/nova-campanha" element={<NovaCampanha />} />
        <Route path="/roi-ontem" element={<RoiOntem />} />
        <Route path="/campanhas/:id" element={<CampanhaDetalhes />} />
        <Route path="/campanhas/:id/duplicar" element={<CampanhaDuplicar />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/meta-test" element={<MetaPausedTest />} />
        <Route path="/campaign-flow" element={<CampaignFlow />} />
        <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/termos-de-uso" element={<TermosDeUso />} />
        <Route path="/exclusao-de-dados" element={<ExclusaoDados />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
