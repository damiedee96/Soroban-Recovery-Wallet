"use client";

import React from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Copy,
  ExternalLink,
  AlertOctagon,
} from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/hooks/useWallet";
import { shortenAddress } from "@/lib/stellar";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import type { Transaction } from "@/types";

export function WalletDashboard() {
  const {
    wallet,
    balance,
    transactions,
    freezeStatus,
    isLoading,
    refetchBalance,
    disconnect,
  } = useWallet();

  if (!wallet) return null;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
    toast.success("Address copied to clipboard");
  };

  const horizonUrl = `${
    process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org"
  }/accounts/${wallet.address}`;

  return (
    <div className="space-y-6">
      {/* Freeze Banner */}
      {freezeStatus.isFrozen && (
        <div className="flex items-center gap-3 bg-indigo-900/30 border border-indigo-500/40 rounded-xl px-4 py-3">
          <AlertOctagon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-300">
              Wallet is frozen
            </p>
            <p className="text-xs text-indigo-400/70">
              All transactions are suspended. Unfreeze from the Security tab.
            </p>
          </div>
        </div>
      )}

      {/* Address Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stellar-600/20 border border-stellar-500/30 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-stellar-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Wallet Address</p>
              <p className="font-mono text-sm text-slate-200">
                {shortenAddress(wallet.address, 8)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyAddress}
              leftIcon={<Copy className="w-3.5 h-3.5" />}
            >
              Copy
            </Button>
            <a href={horizonUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Explorer
              </Button>
            </a>
            <Button variant="ghost" size="sm" onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="XLM Balance"
          value={`${parseFloat(balance).toFixed(2)} XLM`}
          subValue="≈ Stellar Lumens"
          icon={<Wallet className="w-5 h-5" />}
        />
        <StatCard
          label="Transactions"
          value={transactions.length}
          subValue="Recent activity"
          icon={<ArrowUpRight className="w-5 h-5" />}
        />
        <StatCard
          label="Status"
          value={freezeStatus.isFrozen ? "Frozen" : "Active"}
          subValue={freezeStatus.isFrozen ? "Emergency freeze" : "Normal operation"}
          icon={<AlertOctagon className="w-5 h-5" />}
        />
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader
          title="Recent Transactions"
          icon={<ArrowUpRight className="w-4 h-4" />}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={refetchBalance}
              isLoading={isLoading}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          }
        />

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <ArrowUpRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const isSend = tx.type === "send";
  const timeAgo = formatDistanceToNow(new Date(tx.timestamp), {
    addSuffix: true,
  });

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isSend
              ? "bg-red-900/30 text-red-400"
              : "bg-green-900/30 text-green-400"
          }`}
        >
          {isSend ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownLeft className="w-4 h-4" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-200">
            {isSend ? "Sent" : "Received"}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            {shortenAddress(isSend ? tx.to : tx.from)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-semibold ${
            isSend ? "text-red-400" : "text-green-400"
          }`}
        >
          {isSend ? "-" : "+"}
          {tx.amount} {tx.asset}
        </p>
        <p className="text-xs text-slate-500">{timeAgo}</p>
      </div>
    </div>
  );
}
