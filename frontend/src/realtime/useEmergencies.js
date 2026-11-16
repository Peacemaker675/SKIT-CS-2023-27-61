import { useCallback, useEffect, useRef, useState } from "react";
import { emergenciesApi } from "../api/client.js";

// Active emergencies, loaded once on mount and refreshed after start, clear
// and cancel. start(body), clear(id) and cancel(id) re-throw API errors so
// the caller can show them.
// (Live socket updates come later, once the backend sends emergency_update.)
export function useEmergencies() {
  const [emergencies, setEmergencies] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const list = await emergenciesApi.list();
      if (!mounted.current) return;
      setEmergencies(Array.isArray(list) ? list : []);
      setError(null);
    } catch (err) {
      if (mounted.current) setError(err.message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const start = useCallback(
    async (body) => {
      const emergency = await emergenciesApi.start(body);
      await refresh();
      return emergency;
    },
    [refresh],
  );

  const clear = useCallback(
    async (id) => {
      const emergency = await emergenciesApi.clear(id);
      await refresh();
      return emergency;
    },
    [refresh],
  );

  const cancel = useCallback(
    async (id) => {
      const emergency = await emergenciesApi.cancel(id);
      await refresh();
      return emergency;
    },
    [refresh],
  );

  return { emergencies, start, clear, cancel, error, loading };
}
