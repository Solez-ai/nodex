/**
 * Nodex — Diff State Store
 * Created by Samin Yeasar (github.com/Solez-ai | solez.vercel.app)
 */
import { create } from "zustand";
import type { DiffResult } from "../lib/diff/jsonDiff";

interface DiffState {
  active: boolean;
  versionA: string;
  versionB: string;
  diffResult: DiffResult | null;
}

interface DiffActions {
  activate: (a: string, b: string, result: DiffResult) => void;
  deactivate: () => void;
}

const useDiff = create<DiffState & DiffActions>(set => ({
  active: false,
  versionA: "",
  versionB: "",
  diffResult: null,

  activate: (a, b, result) =>
    set({
      active: true,
      versionA: a,
      versionB: b,
      diffResult: result,
    }),

  deactivate: () =>
    set({
      active: false,
      versionA: "",
      versionB: "",
      diffResult: null,
    }),
}));

export default useDiff;
