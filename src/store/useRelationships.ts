/**
 * Nodex — Relationship Store
 * Created by Samin Yeasar (github.com/Solez-ai | solez.vercel.app)
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { InferredRelationship } from "../lib/analysis/relationshipDetector";
import { detectRelationships } from "../lib/analysis/relationshipDetector";

interface RelationshipState {
  relationships: InferredRelationship[];
  enabled: boolean;
  loading: boolean;
}

interface RelationshipActions {
  setEnabled: (enabled: boolean) => void;
  compute: (json: string) => void;
  clear: () => void;
}

const useRelationships = create(
  persist<RelationshipState & RelationshipActions>(
    set => ({
      relationships: [],
      enabled: true,
      loading: false,

      setEnabled: enabled => set({ enabled }),

      compute: (json: string) => {
        set({ loading: true });
        try {
          const relationships = detectRelationships(json);
          set({ relationships, loading: false });
        } catch {
          set({ relationships: [], loading: false });
        }
      },

      clear: () => set({ relationships: [], loading: false }),
    }),
    { name: "nodex-relationships" }
  )
);

export default useRelationships;
