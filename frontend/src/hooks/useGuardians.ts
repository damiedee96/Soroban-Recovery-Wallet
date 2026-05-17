"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRecoveryStore } from "@/store/recoveryStore";
import { useWalletStore } from "@/store/walletStore";
import { guardianRegistryContract } from "@/lib/soroban";
import type { Guardian, GuardianConfig } from "@/types";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function useGuardians() {
  const recoveryStore = useRecoveryStore();
  const walletStore = useWalletStore();
  const queryClient = useQueryClient();

  const walletAddress = walletStore.wallet?.address;
  const secretKey = walletStore.secretKey;

  // Fetch guardian config from backend (which reads from chain)
  const guardianQuery = useQuery({
    queryKey: ["guardians", walletAddress],
    queryFn: async (): Promise<GuardianConfig> => {
      if (!walletAddress) {
        return { guardians: [], threshold: 2, totalGuardians: 0 };
      }
      const res = await axios.get<{ data: GuardianConfig }>(
        `${API_URL}/api/guardian/${walletAddress}`
      );
      return res.data.data;
    },
    enabled: !!walletAddress,
    staleTime: 30_000,
  });

  // Add guardian
  const addMutation = useMutation({
    mutationFn: async ({
      guardianAddress,
      alias,
    }: {
      guardianAddress: string;
      alias?: string;
    }) => {
      if (!walletAddress || !secretKey) {
        throw new Error("Wallet not connected");
      }
      const result = await guardianRegistryContract.addGuardian(
        walletAddress,
        guardianAddress,
        secretKey
      );
      if (!result.success) throw new Error(result.error);

      // Optimistically update store
      const newGuardian: Guardian = {
        address: guardianAddress,
        alias,
        addedAt: Date.now(),
        isActive: true,
      };
      recoveryStore.addGuardian(newGuardian);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guardians"] });
    },
    onError: (err: Error) => recoveryStore.setError(err.message),
  });

  // Remove guardian
  const removeMutation = useMutation({
    mutationFn: async (guardianAddress: string) => {
      if (!walletAddress || !secretKey) {
        throw new Error("Wallet not connected");
      }
      const result = await guardianRegistryContract.removeGuardian(
        walletAddress,
        guardianAddress,
        secretKey
      );
      if (!result.success) throw new Error(result.error);
      recoveryStore.removeGuardian(guardianAddress);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guardians"] });
    },
    onError: (err: Error) => recoveryStore.setError(err.message),
  });

  // Update threshold
  const thresholdMutation = useMutation({
    mutationFn: async (threshold: number) => {
      if (!walletAddress || !secretKey) {
        throw new Error("Wallet not connected");
      }
      const config = guardianQuery.data;
      if (config && threshold > config.totalGuardians) {
        throw new Error(
          `Threshold (${threshold}) cannot exceed total guardians (${config.totalGuardians})`
        );
      }
      const result = await guardianRegistryContract.setThreshold(
        walletAddress,
        threshold,
        secretKey
      );
      if (!result.success) throw new Error(result.error);
      recoveryStore.updateThreshold(threshold);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guardians"] });
    },
    onError: (err: Error) => recoveryStore.setError(err.message),
  });

  const config = guardianQuery.data ?? recoveryStore.guardianConfig;

  return {
    guardians: config?.guardians ?? [],
    threshold: config?.threshold ?? 2,
    totalGuardians: config?.totalGuardians ?? 0,
    isLoading: guardianQuery.isLoading,
    error: recoveryStore.error,

    addGuardian: addMutation.mutate,
    removeGuardian: removeMutation.mutate,
    setThreshold: thresholdMutation.mutate,

    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
    isUpdatingThreshold: thresholdMutation.isPending,
  };
}
