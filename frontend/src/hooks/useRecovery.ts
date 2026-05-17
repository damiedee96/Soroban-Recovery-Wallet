"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRecoveryStore } from "@/store/recoveryStore";
import { useWalletStore } from "@/store/walletStore";
import { recoveryWalletContract } from "@/lib/soroban";
import type { RecoveryRequest } from "@/types";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function useRecovery() {
  const recoveryStore = useRecoveryStore();
  const walletStore = useWalletStore();
  const queryClient = useQueryClient();

  const walletAddress = walletStore.wallet?.address;
  const secretKey = walletStore.secretKey;

  // Fetch active recovery request
  const activeRequestQuery = useQuery({
    queryKey: ["recovery", "active", walletAddress],
    queryFn: async (): Promise<RecoveryRequest | null> => {
      if (!walletAddress) return null;
      const res = await axios.get<{ data: RecoveryRequest | null }>(
        `${API_URL}/api/recovery/${walletAddress}/active`
      );
      return res.data.data ?? null;
    },
    enabled: !!walletAddress,
    refetchInterval: 10_000,
  });

  // Fetch recovery history
  const historyQuery = useQuery({
    queryKey: ["recovery", "history", walletAddress],
    queryFn: async (): Promise<RecoveryRequest[]> => {
      if (!walletAddress) return [];
      const res = await axios.get<{ data: RecoveryRequest[] }>(
        `${API_URL}/api/recovery/${walletAddress}/history`
      );
      return res.data.data ?? [];
    },
    enabled: !!walletAddress,
  });

  // Initiate recovery
  const initiateMutation = useMutation({
    mutationFn: async (newOwner: string) => {
      if (!walletAddress || !secretKey) {
        throw new Error("Wallet not connected");
      }
      return recoveryWalletContract.initiateRecovery(
        walletAddress,
        newOwner,
        secretKey
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery"] });
    },
    onError: (err: Error) => recoveryStore.setError(err.message),
  });

  // Approve recovery (guardian action)
  const approveMutation = useMutation({
    mutationFn: async ({
      requestId,
      guardianSecretKey,
    }: {
      requestId: string;
      guardianSecretKey: string;
    }) => {
      if (!walletAddress) throw new Error("No wallet address");
      return recoveryWalletContract.approveRecovery(
        walletAddress,
        requestId,
        guardianSecretKey
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery"] });
    },
    onError: (err: Error) => recoveryStore.setError(err.message),
  });

  // Cancel recovery (owner action)
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!walletAddress || !secretKey) {
        throw new Error("Wallet not connected");
      }
      return recoveryWalletContract.cancelRecovery(walletAddress, secretKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery"] });
    },
    onError: (err: Error) => recoveryStore.setError(err.message),
  });

  // Execute recovery (after delay + threshold met)
  const executeMutation = useMutation({
    mutationFn: async (executorSecretKey: string) => {
      if (!walletAddress) throw new Error("No wallet address");
      return recoveryWalletContract.executeRecovery(
        walletAddress,
        executorSecretKey
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
    },
    onError: (err: Error) => recoveryStore.setError(err.message),
  });

  const activeRequest = activeRequestQuery.data ?? recoveryStore.activeRequest;

  // Compute time remaining for the delay window
  const timeRemaining = activeRequest
    ? Math.max(0, activeRequest.executeAfter - Date.now())
    : 0;

  const canExecute =
    activeRequest?.status === "approved" && timeRemaining === 0;

  return {
    activeRequest,
    history: historyQuery.data ?? recoveryStore.requestHistory,
    timeRemaining,
    canExecute,
    isLoading:
      recoveryStore.isLoading ||
      activeRequestQuery.isLoading ||
      historyQuery.isLoading,
    error: recoveryStore.error,

    initiateRecovery: initiateMutation.mutate,
    approveRecovery: approveMutation.mutate,
    cancelRecovery: cancelMutation.mutate,
    executeRecovery: executeMutation.mutate,

    isInitiating: initiateMutation.isPending,
    isApproving: approveMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isExecuting: executeMutation.isPending,
  };
}
