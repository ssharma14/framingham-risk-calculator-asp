import { useCallback, useEffect, useState } from 'react';
import { fetchHistory, type AssessmentSummary } from '../lib/api';

// Loads assessment history and exposes reload(). Failures are non-fatal.
export function useAssessmentHistory() {
  const [history, setHistory] = useState<AssessmentSummary[]>([]);

  // setState in the promise callback (not the effect body); ignore stale resolves.
  useEffect(() => {
    let ignore = false;
    fetchHistory()
      .then((rows) => {
        if (!ignore) setHistory(rows);
      })
      .catch(() => {
        /* history is best-effort */
      });
    return () => {
      ignore = true;
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      setHistory(await fetchHistory());
    } catch {
      /* history is best-effort */
    }
  }, []);

  return { history, reload };
}
