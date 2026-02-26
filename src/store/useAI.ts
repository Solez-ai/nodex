/**
 * Nodex — AI Insights Zustand Store
 * Created by Samin Yeasar (github.com/Solez-ai | solez.vercel.app)
 */
import { create } from "zustand";
import type { AIInsights } from "../lib/ai/geminiService";
import { explainData, extractSchemaSummary } from "../lib/ai/geminiService";

const API_KEY_STORAGE = "nodex_gemini_api_key";

interface AIState {
  apiKey: string | null;
  insights: AIInsights | null;
  loading: boolean;
  error: string | null;
  panelOpen: boolean;
}

interface AIActions {
  setApiKey: (key: string) => void;
  removeApiKey: () => void;
  fetchInsights: (contents: string, format: string) => Promise<void>;
  clearInsights: () => void;
  setPanelOpen: (open: boolean) => void;
}

const getStoredKey = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(API_KEY_STORAGE);
};

const useAI = create<AIState & AIActions>((set, get) => ({
  apiKey: null, // lazily loaded in setApiKey or fetchInsights
  insights: null,
  loading: false,
  error: null,
  panelOpen: false,

  setApiKey: (key: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(API_KEY_STORAGE, key);
    }
    set({ apiKey: key, error: null });
  },

  removeApiKey: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(API_KEY_STORAGE);
    }
    set({ apiKey: null });
  },

  fetchInsights: async (contents: string, format: string) => {
    // Lazily load key from localStorage if not in memory
    const apiKey = get().apiKey ?? getStoredKey();
    if (!apiKey) {
      set({
        error: "No Gemini API key set. Open Tools → AI Settings to add your key.",
        panelOpen: true,
      });
      return;
    }

    // Cache key in memory if loaded from storage
    if (!get().apiKey) set({ apiKey });

    set({ loading: true, error: null, insights: null, panelOpen: true });

    try {
      const schemaSummary = extractSchemaSummary(contents, format);
      const insights = await explainData(apiKey, schemaSummary);
      set({ insights, loading: false });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.includes("API_KEY_INVALID") || err.message.includes("400")
            ? "Invalid Gemini API key. Please check your key in Tools → AI Settings."
            : err.message.includes("429")
              ? "Rate limit exceeded. Please wait a moment and try again."
              : err.message
          : "An unexpected error occurred.";
      set({ error: msg, loading: false });
    }
  },

  clearInsights: () => set({ insights: null, error: null }),
  setPanelOpen: open => set({ panelOpen: open }),
}));

export default useAI;
