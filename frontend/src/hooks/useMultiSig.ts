"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWalletStore } from "@/store/walletStore";
import { invokeContract, CONTRACT_IDS, addressToScVal, u64ToScVal } from "@/lib/soroban";
import { nativeToScVal } from "@stellar/stellar-sdk";
import type { MultiSigProposal } from "@/types";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function useMultiSig() {
  const walletStore = useWalletStore();
  const queryClient = useQueryClient();

  const walletAddress = walletStore.wallet?.address;
  const secretKey = walletStore.secretKey;

  // Fetch proposals
  const proposalsQuery = useQuery({
    queryKey: ["multisig", "proposals", walletAddress],
    queryFn: async (): Promise<MultiSigProposal[]> => {
      if (!walletAddress) return [];
      const res = await axios.get<{ data: MultiSigProposal[] }>(
        `${API_URL}/api/multisig/${walletAddress}/proposals`
      );
      return res.data.data ?? [];
    },
    enabled: !!walletAddress,
    refetchInterval: 15_000,
  });

  // Create proposal
  const createMutation = useMutation({
    mutationFn: async (data: {
      destination: string;
      amount: string;
      asset: string;
      memo?: string;
    }) => {
      if (!walletAddress || !secretKey) throw new Error("Wallet not connected");
      return invokeContract({
        contractId: CONTRACT_IDS.multisig,
        method: "create_proposal",
        args: [
          addressToScVal(walletAddress),
          addressToScVal(data.destination),
          nativeToScVal(data.amount, { type: "string" }),
          nativeToScVal(data.asset, { type: "string" }),
        ],
        signerSecretKey: secretKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multisig"] });
    },
  });

  // Approve proposal
  const approveMutation = useMutation({
    mutationFn: async ({
      proposalId,
      signerSecretKey,
    }: {
      proposalId: string;
      signerSecretKey: string;
    }) => {
      if (!walletAddress) throw new Error("No wallet address");
      return invokeContract({
        contractId: CONTRACT_IDS.multisig,
        method: "approve_proposal",
        args: [addressToScVal(walletAddress), nativeToScVal(proposalId, { type: "string" })],
        signerSecretKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multisig"] });
    },
  });

  // Reject proposal
  const rejectMutation = useMutation({
    mutationFn: async ({
      proposalId,
      signerSecretKey,
    }: {
      proposalId: string;
      signerSecretKey: string;
    }) => {
      if (!walletAddress) throw new Error("No wallet address");
      return invokeContract({
        contractId: CONTRACT_IDS.multisig,
        method: "reject_proposal",
        args: [addressToScVal(walletAddress), nativeToScVal(proposalId, { type: "string" })],
        signerSecretKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multisig"] });
    },
  });

  // Execute proposal
  const executeMutation = useMutation({
    mutationFn: async ({
      proposalId,
      signerSecretKey,
    }: {
      proposalId: string;
      signerSecretKey: string;
    }) => {
      if (!walletAddress) throw new Error("No wallet address");
      return invokeContract({
        contractId: CONTRACT_IDS.multisig,
        method: "execute_proposal",
        args: [addressToScVal(walletAddress), nativeToScVal(proposalId, { type: "string" })],
        signerSecretKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multisig"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
    },
  });

  return {
    proposals: proposalsQuery.data ?? [],
    isLoading: proposalsQuery.isLoading,

    createProposal: createMutation.mutate,
    approveProposal: approveMutation.mutate,
    rejectProposal: rejectMutation.mutate,
    executeProposal: executeMutation.mutate,

    isCreating: createMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isExecuting: executeMutation.isPending,

    error:
      createMutation.error?.message ??
      approveMutation.error?.message ??
      null,
  };
}
