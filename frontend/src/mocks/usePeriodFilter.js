import { useMemo, useState } from "react";

export default function usePeriodFilter({ options, initial, dataByPeriod }) {
  const fallback = options?.[0] ?? "";
  const [activePeriod, setActivePeriod] = useState(initial ?? fallback);

  const data = useMemo(() => {
    if (!dataByPeriod) return null;
    return dataByPeriod[activePeriod] ?? dataByPeriod[fallback] ?? null;
  }, [activePeriod, dataByPeriod, fallback]);

  return { activePeriod, setActivePeriod, options: options ?? [], data };
}

