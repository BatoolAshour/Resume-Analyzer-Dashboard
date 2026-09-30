"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getHealth } from "@/lib/api";
import type { HealthResponse } from "@/types/analysis";

type HealthState =
  | { status: "checking"; health: null }
  | { status: "online"; health: HealthResponse }
  | { status: "offline"; health: null };

interface HealthContextValue {
  state: HealthState;
  refresh: () => void;
}

const HealthContext = createContext<HealthContextValue | null>(null);

// Keep checking so the status follows the backend being started or stopped:
// quickly while it is unreachable, occasionally while it is up.
const OFFLINE_RETRY_MS = 5_000;
const ONLINE_RECHECK_MS = 20_000;

export function HealthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HealthState>({ status: "checking", health: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;
    const checkAgainIn = (ms: number) => {
      retry = setTimeout(() => setAttempt((n) => n + 1), ms);
    };

    getHealth(controller.signal)
      .then((health) => {
        setState({ status: "online", health });
        checkAgainIn(ONLINE_RECHECK_MS);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState({ status: "offline", health: null });
        checkAgainIn(OFFLINE_RETRY_MS);
      });

    return () => {
      controller.abort();
      clearTimeout(retry);
    };
  }, [attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);
  const value = useMemo(() => ({ state, refresh }), [state, refresh]);

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
}

export function useHealth(): HealthContextValue {
  const context = useContext(HealthContext);
  if (!context) throw new Error("useHealth must be used inside <HealthProvider>");
  return context;
}
