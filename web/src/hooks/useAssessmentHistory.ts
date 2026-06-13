import { useCallback, useEffect, useState } from 'react';
import { fetchHistory, type AssessmentSummary } from '../lib/api';

// History is best-effort: failures are ignored.
export function useAssessmentHistory() {
  const [history, setHistory] = useState<AssessmentSummary[]>([]);

  useEffect(() => {
    let ignore = false;
    fetchHistory()
      .then((rows) => !ignore && setHistory(rows))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      setHistory(await fetchHistory());
    } catch {
      // ignore
    }
  }, []);

  return { history, reload };
}
