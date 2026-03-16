import { useState, useEffect } from "react";

export interface SearchProgress {
  pct: number;
  msg: string;
}

export interface SearchResult {
  total: number;
  filepath: string;
}

export function useSearchStream(jobId: string | null) {
  const [progress, setProgress] = useState<SearchProgress>({ pct: 0, msg: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  useEffect(() => {
    if (!jobId) {
      setProgress({ pct: 0, msg: "" });
      setDone(false);
      setError(null);
      setResult(null);
      return;
    }

    setProgress({ pct: 0, msg: "Connecting to search engine..." });
    setDone(false);
    setError(null);
    setResult(null);

    const es = new EventSource(`/api/search/stream/${jobId}`);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "progress") {
          setProgress({ pct: data.pct, msg: data.msg });
        } else if (data.type === "status") {
          setProgress((p) => ({ ...p, msg: data.msg }));
        } else if (data.type === "done") {
          setResult({ total: data.total, filepath: data.filepath });
          setProgress({ pct: 100, msg: "Search Complete!" });
          setDone(true);
          es.close();
        } else if (data.type === "error") {
          setError(data.msg);
          setDone(true);
          es.close();
        } else if (data.type === "end") {
          setDone(true);
          es.close();
        }
      } catch (err) {
        console.error("Failed to parse SSE message", e.data);
      }
    };

    es.onerror = () => {
      setError("Lost connection to the streaming server.");
      setDone(true);
      es.close();
    };

    return () => {
      es.close();
    };
  }, [jobId]);

  return { progress, done, error, result };
}
