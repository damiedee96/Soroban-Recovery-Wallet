import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { RecoveryRequest, GuardianConfig, Guardian } from "@/types";

interface RecoveryStore {
  // State
  activeRequest: RecoveryRequest | null;
  requestHistory: RecoveryRequest[];
  guardianConfig: GuardianConfig | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveRequest: (request: RecoveryRequest | null) => void;
  setRequestHistory: (history: RecoveryRequest[]) => void;
  addToHistory: (request: RecoveryRequest) => void;
  setGuardianConfig: (config: GuardianConfig | null) => void;
  addGuardian: (guardian: Guardian) => void;
  removeGuardian: (address: string) => void;
  updateThreshold: (threshold: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  activeRequest: null,
  requestHistory: [],
  guardianConfig: null,
  isLoading: false,
  error: null,
};

export const useRecoveryStore = create<RecoveryStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setActiveRequest: (activeRequest) => set({ activeRequest }),

      setRequestHistory: (requestHistory) => set({ requestHistory }),

      addToHistory: (request) =>
        set((state) => ({
          requestHistory: [request, ...state.requestHistory],
        })),

      setGuardianConfig: (guardianConfig) => set({ guardianConfig }),

      addGuardian: (guardian) =>
        set((state) => {
          if (!state.guardianConfig) return state;
          const exists = state.guardianConfig.guardians.some(
            (g) => g.address === guardian.address
          );
          if (exists) return state;
          return {
            guardianConfig: {
              ...state.guardianConfig,
              guardians: [...state.guardianConfig.guardians, guardian],
              totalGuardians: state.guardianConfig.totalGuardians + 1,
            },
          };
        }),

      removeGuardian: (address) =>
        set((state) => {
          if (!state.guardianConfig) return state;
          const filtered = state.guardianConfig.guardians.filter(
            (g) => g.address !== address
          );
          return {
            guardianConfig: {
              ...state.guardianConfig,
              guardians: filtered,
              totalGuardians: filtered.length,
            },
          };
        }),

      updateThreshold: (threshold) =>
        set((state) => {
          if (!state.guardianConfig) return state;
          return {
            guardianConfig: { ...state.guardianConfig, threshold },
          };
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      reset: () => set(initialState),
    }),
    { name: "RecoveryStore" }
  )
);
