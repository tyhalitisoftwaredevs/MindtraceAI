"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, type ApiRole } from "@/lib/api";

export function useApi<T>(path: string, fallback: T, role: ApiRole = "learner") {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await apiGet(path, fallback, role));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The learning service could not be reached.");
    } finally {
      setLoading(false);
    }
  }, [path, fallback, role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
