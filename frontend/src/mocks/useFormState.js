import { useCallback, useMemo, useState } from "react";

export default function useFormState(initialValues) {
  const [values, setValues] = useState(() => ({ ...(initialValues ?? {}) }));

  const setField = useCallback((field, nextValue) => {
    setValues((prev) => ({ ...prev, [field]: nextValue }));
  }, []);

  const reset = useCallback(() => {
    setValues({ ...(initialValues ?? {}) });
  }, [initialValues]);

  const bind = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(values).map((key) => [
          key,
          {
            value: values[key] ?? "",
            onChange: (e) => setField(key, e.target.value),
          },
        ]),
      ),
    [setField, values],
  );

  return { values, setValues, setField, reset, bind };
}

