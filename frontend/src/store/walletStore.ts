import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import type { Wallet, Transaction, FreezeStatus } from "@/types";

interface WalletStore {
  // State
  wallet: Wallet | null;
  transactions: Transaction[];
  freezeStatus: FreezeStatus;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  secretKey: string | null; // In-memory only — never persisted

  // Actions
  setWallet: (wallet: Wallet | null) => void;
  setTransactions: (txs: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  setFreezeStatus: (status: FreezeStatus) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSecretKey: (key: string | null) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        wallet: null,
        transactions: [],
        freezeStatus: { isFrozen: false },
        isConnected: false,
        isLoading: false,
        error: null,
        secretKey: null,

        // Actions
        setWallet: (wallet) => set({ wallet }),

        setTransactions: (transactions) => set({ transactions }),

        addTransaction: (tx) =>
          set((state) => ({
            transactions: [tx, ...state.transactions].slice(0, 50), // keep last 50
          })),

        setFreezeStatus: (freezeStatus) => set({ freezeStatus }),

        setConnected: (isConnected) => set({ isConnected }),

        setLoading: (isLoading) => set({ isLoading }),

        setError: (error) => set({ error }),

        setSecretKey: (secretKey) => set({ secretKey }),

        disconnect: () =>
          set({
            wallet: null,
            transactions: [],
            freezeStatus: { isFrozen: false },
            isConnected: false,
            error: null,
            secretKey: null,
          }),
      }),
      {
        name: "recovery-wallet-store",
        // Never persist the secret key
        partialize: (state) => ({
          wallet: state.wallet,
          isConnected: state.isConnected,
        }),
      }
    ),
    { name: "WalletStore" }
  )
);
