import { useState, useEffect, useRef } from "react";

export interface SearchProgress {
  pct: number;
  msg: string;
}

export interface SearchResult {
  total: number;
  filepath: string;
}

const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const TOKEN_KEY = "jspro_token";

export function useSearchStream(jobId: string | null) {
  const [progress, setProgress] = useState<SearchProgress>({ pct: 0, msg: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) {
      setProgress({ pct: 0, msg: "" });
      setDone(false);
      setError(null);
      setResult(null);
      return;
    }

    setProgress({ pct: 0, msg: "Starting search worker..." });
    setDone(false);
    setError(null);
    setResult(null);

    const token = localStorage.getItem(TOKEN_KEY) ?? "";

    const poll = async () => {
      try {
        const resp = await fetch(
          `${BASE_URL}/api/search/results/${jobId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!resp.ok) {
          throw new Error(`Server returned ${resp.status}`);
        }

        const data = await resp.json();

        setProgress({
          pct: data.progress_pct ?? 0,
          msg: data.progress_msg ?? "",
        });

        if (data.status === "completed") {
          setResult({ total: data.total, filepath: data.filepath });
          setProgress({ pct: 100, msg: "Search Complete!" });
          setDone(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else if (data.status === "error") {
          setError(data.error ?? "Search failed");
          setDone(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch (err: any) {
        setError("Search worker error — check that the API server is running.");
        setDone(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 1500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId]);

  return { progress, done, error, result };
}
