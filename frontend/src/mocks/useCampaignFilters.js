import { useMemo, useState } from "react";

export default function useCampaignFilters(campaigns) {
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sortMode, setSortMode] = useState("Nome A-Z");

  const filtered = useMemo(() => {
    const list = Array.isArray(campaigns) ? [...campaigns] : [];

    const statusFiltered =
      statusFilter === "Todos"
        ? list
        : list.filter((c) => String(c.status ?? "").toLowerCase().includes(statusFilter.toLowerCase()));

    if (sortMode === "Nome A-Z") {
      statusFiltered.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    } else if (sortMode === "Nome Z-A") {
      statusFiltered.sort((a, b) => String(b.name ?? "").localeCompare(String(a.name ?? "")));
    }

    return statusFiltered;
  }, [campaigns, sortMode, statusFilter]);

  function cycleStatus() {
    setStatusFilter((prev) => (prev === "Todos" ? "Publicado" : prev === "Publicado" ? "Rascunho" : "Todos"));
  }

  function cycleSort() {
    setSortMode((prev) => (prev === "Nome A-Z" ? "Nome Z-A" : "Nome A-Z"));
  }

  return { campaigns: filtered, statusFilter, sortMode, cycleStatus, cycleSort };
}

