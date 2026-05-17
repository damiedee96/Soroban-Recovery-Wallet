"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWalletStore } from "@/store/walletStore";
import { getXlmBalance, getTransactionHistory } from "@/lib/stellar";
import { recoveryWalletContract } from "@/lib/soroban";
import type { Wallet, Transaction } from "@/types";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ─── Wallet Connection ────────────────────────────────────────

export function useWallet() {
  const store = useWalletStore();
  const queryClient = useQueryClient();

  // Fetch wallet balance from Horizon
  const balanceQuery = useQuery({
    queryKey: ["balance", store.wallet?.address],
    queryFn: async () => {
      if (!store.wallet?.address) return "0";
      return getXlmBalance(store.wallet.address);
    },
    enabled: !!store.wallet?.address && store.isConnected,
    refetchInterval: 15_000, // refresh every 15s
  });

  // Fetch transaction history
  const txQuery = useQuery({
    queryKey: ["transactions", store.wallet?.address],
    queryFn: async (): Promise<Transaction[]> => {
      if (!store.wallet?.address) return [];
      const records = await getTransactionHistory(store.wallet.address, 20);
      return records.map((r) => ({
        id: r.id,
        type: "send",
        amount: "0",
        asset: "XLM",
        from: r.source_account,
        to: "",
        timestamp: new Date(r.created_at).getTime(),
        status: r.successful ? "success" : "failed",
        ledger: r.ledger,
      }));
    },
    enabled: !!store.wallet?.address && store.isConnected,
    refetchInterval: 30_000,
  });

  // Connect wallet with a secret key
  const connectMutation = useMutation({
    mutationFn: async (secretKey: string) => {
      const { Keypair } = await import("@stellar/stellar-sdk");
      const kp = Keypair.fromSecret(secretKey);
      const publicKey = kp.publicKey();
      const balance = await getXlmBalance(publicKey);

      const wallet: Wallet = {
        address: publicKey,
        publicKey,
        balance,
        isFrozen: false,
        createdAt: Date.now(),
        owner: publicKey,
      };

      return { wallet, secretKey };
    },
    onSuccess: ({ wallet, secretKey }) => {
      store.setWallet(wallet);
      store.setSecretKey(secretKey);
      store.setConnected(true);
      store.setError(null);
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (err: Error) => {
      store.setError(err.message);
    },
  });

  // Freeze wallet
  const freezeMutation = useMutation({
    mutationFn: async () => {
      if (!store.wallet || !store.secretKey) {
        throw new Error("Wallet not connected");
      }
      return recoveryWalletContract.freeze(
        store.wallet.address,
        store.secretKey
      );
    },
    onSuccess: () => {
      store.setFreezeStatus({ isFrozen: true, frozenAt: Date.now() });
      if (store.wallet) {
        store.setWallet({ ...store.wallet, isFrozen: true });
      }
    },
    onError: (err: Error) => store.setError(err.message),
  });

  // Unfreeze wallet
  const unfreezeMutation = useMutation({
    mutationFn: async () => {
      if (!store.wallet || !store.secretKey) {
        throw new Error("Wallet not connected");
      }
      return recoveryWalletContract.unfreeze(
        store.wallet.address,
        store.secretKey
      );
    },
    onSuccess: () => {
      store.setFreezeStatus({ isFrozen: false });
      if (store.wallet) {
        store.setWallet({ ...store.wallet, isFrozen: false });
      }
    },
    onError: (err: Error) => store.setError(err.message),
  });

  const disconnect = useCallback(() => {
    store.disconnect();
    queryClient.clear();
  }, [store, queryClient]);

  return {
    wallet: store.wallet,
    balance: balanceQuery.data ?? store.wallet?.balance ?? "0",
    transactions: txQuery.data ?? store.transactions,
    freezeStatus: store.freezeStatus,
    isConnected: store.isConnected,
    isLoading:
      store.isLoading ||
      connectMutation.isPending ||
      balanceQuery.isLoading,
    error: store.error,

    connect: connectMutation.mutate,
    disconnect,
    freeze: freezeMutation.mutate,
    unfreeze: unfreezeMutation.mutate,
    isFreezing: freezeMutation.isPending,
    isUnfreezing: unfreezeMutation.isPending,

    refetchBalance: () =>
      queryClient.invalidateQueries({ queryKey: ["balance"] }),
  };
}
