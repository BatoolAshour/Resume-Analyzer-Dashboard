"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyzeAts,
  analyzeFullReport,
  analyzeMatch,
  ApiError,
  type JobDescriptionInput,
} from "@/lib/api";
import type { AnalysisMode, AnalysisResult } from "@/types/analysis";

export type AnalysisRequest =
  | { mode: "ats"; resume: File }
  | { mode: "match"; resume: File; jobDescription: JobDescriptionInput }
  | { mode: "report"; resume: File; jobDescription: JobDescriptionInput };

export type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; mode: AnalysisMode }
  | { status: "success"; result: AnalysisResult }
  | { status: "error"; error: ApiError; mode: AnalysisMode };

function send(request: AnalysisRequest, signal: AbortSignal): Promise<AnalysisResult> {
  switch (request.mode) {
    case "ats":
      return analyzeAts(request.resume, signal);
    case "match":
      return analyzeMatch(request.resume, request.jobDescription, signal);
    case "report":
      return analyzeFullReport(request.resume, request.jobDescription, signal);
  }
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<AnalysisRequest | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(async (request: AnalysisRequest) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    lastRequestRef.current = request;
    setState({ status: "loading", mode: request.mode });

    try {
      const result = await send(request, controller.signal);
      if (!controller.signal.aborted) setState({ status: "success", result });
    } catch (cause) {
      if (controller.signal.aborted) return; // cancelled or superseded
      const error =
        cause instanceof ApiError
          ? cause
          : new ApiError("unknown_error", "Something went wrong. Please try again.");
      setState({ status: "error", error, mode: request.mode });
    }
  }, []);

  /** Re-send the last request exactly as it was submitted. */
  const retry = useCallback(() => {
    if (lastRequestRef.current) void run(lastRequestRef.current);
  }, [run]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setState({ status: "idle" });
  }, []);

  return { state, run, retry, reset };
}
