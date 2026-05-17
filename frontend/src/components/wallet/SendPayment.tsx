"use client";

import React, { useState } from "react";
import {
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useSendPayment } from "@/hooks/useSendPayment";
import { useWallet } from "@/hooks/useWallet";
import { isValidPublicKey, shortenAddress } from "@/lib/stellar";
import toast from "react-hot-toast";

interface SendPaymentProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "form" | "confirm" | "success";

export function SendPayment({ isOpen, onClose }: SendPaymentProps) {
  const { balance, freezeStatus } = useWallet();
  const { sendPayment, isSending, lastTxHash, reset } = useSendPayment();

  const [step, setStep] = useState<Step>("form");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const horizonUrl = process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!destination.trim()) {
      newErrors.destination = "Destination is required";
    } else if (!isValidPublicKey(destination.trim())) {
      newErrors.destination = "Invalid Stellar public key";
    }

    if (!amount) {
      newErrors.amount = "Amount is required";
    } else if (isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = "Amount must be a positive number";
    } else if (Number(amount) > Number(balance)) {
      newErrors.amount = "Insufficient balance";
    }

    if (memo && memo.length > 28) {
      newErrors.memo = "Memo must be 28 characters or fewer";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) setStep("confirm");
  };

  const handleSend = () => {
    sendPayment(
      { destination: destination.trim(), amount, memo: memo.trim() || undefined },
      {
        onSuccess: () => {
          setStep("success");
          toast.success("Transaction submitted");
        },
        onError: (err: Error) => {
          toast.error(err.message);
          setStep("form");
        },
      }
    );
  };

  const handleClose = () => {
    setStep("form");
    setDestination("");
    setAmount("");
    setMemo("");
    setErrors({});
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === "success" ? "Transaction Sent" : step === "confirm" ? "Confirm Transaction" : "Send XLM"
      }
      size="md"
      disableBackdropClose={isSending}
    >
      {step === "form" && (
        <form onSubmit={handleReview} className="space-y-4">
          {freezeStatus.isFrozen && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/30 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">
                Wallet is frozen. Unfreeze it before sending.
              </p>
            </div>
          )}

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Recipient Address <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="G..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500"
              spellCheck={false}
              autoComplete="off"
            />
            {errors.destination && (
              <p className="text-xs text-red-400 mt-1">{errors.destination}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-300">
                Amount (XLM) <span className="text-red-400">*</span>
              </label>
              <span className="text-xs text-slate-500">
                Balance: {parseFloat(balance).toFixed(2)} XLM
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0.0000001"
                step="0.0000001"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 pr-16 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500"
              />
              <button
                type="button"
                onClick={() => setAmount((Number(balance) - 1).toFixed(7))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stellar-400 hover:text-stellar-300 font-medium"
              >
                MAX
              </button>
            </div>
            {errors.amount && (
              <p className="text-xs text-red-400 mt-1">{errors.amount}</p>
            )}
          </div>

          {/* Memo */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Memo{" "}
              <span className="text-slate-500 font-normal">(optional, max 28 chars)</span>
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Payment reference"
              maxLength={28}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500"
            />
            {errors.memo && (
              <p className="text-xs text-red-400 mt-1">{errors.memo}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={handleClose} type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={freezeStatus.isFrozen}
              leftIcon={<ArrowUpRight className="w-4 h-4" />}
            >
              Review
            </Button>
          </div>
        </form>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">To</span>
              <span className="font-mono text-slate-200">
                {shortenAddress(destination, 10)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Amount</span>
              <span className="text-white font-bold text-base">
                {amount} XLM
              </span>
            </div>
            {memo && (
              <div className="flex justify-between">
                <span className="text-slate-400">Memo</span>
                <span className="text-slate-200">{memo}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-700/50 pt-3">
              <span className="text-slate-400">Network fee</span>
              <span className="text-slate-400">~0.00001 XLM</span>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-700/30 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300">
              Blockchain transactions are irreversible. Double-check the recipient address.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setStep("form")} disabled={isSending}>
              Back
            </Button>
            <Button
              onClick={handleSend}
              isLoading={isSending}
              leftIcon={<ArrowUpRight className="w-4 h-4" />}
            >
              Confirm & Send
            </Button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="text-center space-y-4 py-2">
          <div className="w-14 h-14 bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Transaction Submitted</p>
            <p className="text-sm text-slate-400 mt-1">
              {amount} XLM sent to {shortenAddress(destination, 6)}
            </p>
          </div>
          {lastTxHash && (
            <a
              href={`${horizonUrl}/transactions/${lastTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-stellar-400 hover:text-stellar-300"
            >
              View on Explorer
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <Button fullWidth onClick={handleClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
