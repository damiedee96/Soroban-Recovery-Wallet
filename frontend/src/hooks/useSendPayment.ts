"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWalletStore } from "@/store/walletStore";
import {
  buildPaymentTransaction,
  isValidPublicKey,
} from "@/lib/stellar";
import { Keypair } from "@stellar/stellar-sdk";
import type { Transaction } from "@/types";

export interface SendPaymentParams {
  destination: string;
  amount: string;
  memo?: string;
}

export function useSendPayment() {
  const walletStore = useWalletStore();
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: async ({ destination, amount, memo }: SendPaymentParams) => {
      const { wallet, secretKey, freezeStatus } = walletStore;

      if (!wallet || !secretKey) throw new Error("Wallet not connected");
      if (freezeStatus.isFrozen) throw new Error("Wallet is frozen — unfreeze before sending");
      if (!isValidPublicKey(destination)) throw new Error("Invalid destination address");
      if (isNaN(Number(amount)) || Number(amount) <= 0) throw new Error("Invalid amount");

      const signer = Keypair.fromSecret(secretKey);

      // Build the transaction
      const tx = await buildPaymentTransaction({
        sourcePublicKey: wallet.address,
        destination,
        amount,
        memo,
      });

      // Sign
      tx.sign(signer);

      // Submit to Horizon
      const { horizonServer, networkPassphrase } = await import("@/lib/stellar");
      const result = await horizonServer.submitTransaction(tx);

      const newTx: Transaction = {
        id: result.hash,
        type: "send",
        amount,
        asset: "XLM",
        from: wallet.address,
        to: destination,
        memo,
        timestamp: Date.now(),
        status: "success",
      };

      walletStore.addTransaction(newTx);
      return { txHash: result.hash, transaction: newTx };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  return {
    sendPayment: sendMutation.mutate,
    sendPaymentAsync: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    error: sendMutation.error?.message ?? null,
    lastTxHash: sendMutation.data?.txHash,
    reset: sendMutation.reset,
  };
}
