"use client";

import React, { useState } from "react";
import {
  Shield,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useMultiSig } from "@/hooks/useMultiSig";
import { isValidPublicKey, shortenAddress } from "@/lib/stellar";
import { formatDistanceToNow, format } from "date-fns";
import toast from "react-hot-toast";
import type { MultiSigProposal, ProposalStatus } from "@/types";

const STATUS_CONFIG: Record<
  ProposalStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  open: {
    label: "Open",
    color: "text-yellow-400",
    bg: "bg-yellow-900/20",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  approved: {
    label: "Approved",
    color: "text-green-400",
    bg: "bg-green-900/20",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  executed: {
    label: "Executed",
    color: "text-stellar-400",
    bg: "bg-stellar-600/10",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-400",
    bg: "bg-red-900/20",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  expired: {
    label: "Expired",
    color: "text-slate-400",
    bg: "bg-slate-800",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

export function MultiSigPanel() {
  const {
    proposals,
    isLoading,
    createProposal,
    approveProposal,
    rejectProposal,
    executeProposal,
    isCreating,
    isApproving,
    isRejecting,
    isExecuting,
  } = useMultiSig();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<MultiSigProposal | null>(null);

  const openProposals = proposals.filter((p) => p.status === "open");
  const closedProposals = proposals.filter((p) => p.status !== "open");

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Multi-Signature Proposals</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Require multiple approvals for sensitive transactions
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Proposal
        </Button>
      </div>

      {/* Open proposals */}
      <Card>
        <CardHeader
          title="Open Proposals"
          icon={<Shield className="w-4 h-4" />}
          subtitle={`${openProposals.length} awaiting approval`}
        />
        {isLoading ? (
          <div className="py-8 text-center text-slate-500 text-sm">Loading…</div>
        ) : openProposals.length === 0 ? (
          <div className="py-8 text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-slate-400 text-sm">No open proposals</p>
          </div>
        ) : (
          <CardBody>
            {openProposals.map((p) => (
              <ProposalRow
                key={p.id}
                proposal={p}
                onSelect={() => setSelectedProposal(p)}
              />
            ))}
          </CardBody>
        )}
      </Card>

      {/* Closed proposals */}
      {closedProposals.length > 0 && (
        <Card>
          <CardHeader title="History" icon={<Clock className="w-4 h-4" />} />
          <CardBody>
            {closedProposals.map((p) => (
              <ProposalRow
                key={p.id}
                proposal={p}
                onSelect={() => setSelectedProposal(p)}
              />
            ))}
          </CardBody>
        </Card>
      )}

      {/* Create Modal */}
      <CreateProposalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(data) => {
          createProposal(data, {
            onSuccess: () => {
              setShowCreateModal(false);
              toast.success("Proposal created");
            },
            onError: (err: Error) => toast.error(err.message),
          });
        }}
        isLoading={isCreating}
      />

      {/* Proposal Detail Modal */}
      {selectedProposal && (
        <ProposalDetailModal
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onApprove={(key) =>
            approveProposal(
              { proposalId: selectedProposal.id, signerSecretKey: key },
              {
                onSuccess: () => {
                  setSelectedProposal(null);
                  toast.success("Approved");
                },
                onError: (err: Error) => toast.error(err.message),
              }
            )
          }
          onReject={(key) =>
            rejectProposal(
              { proposalId: selectedProposal.id, signerSecretKey: key },
              {
                onSuccess: () => {
                  setSelectedProposal(null);
                  toast.success("Rejected");
                },
                onError: (err: Error) => toast.error(err.message),
              }
            )
          }
          onExecute={(key) =>
            executeProposal(
              { proposalId: selectedProposal.id, signerSecretKey: key },
              {
                onSuccess: () => {
                  setSelectedProposal(null);
                  toast.success("Executed");
                },
                onError: (err: Error) => toast.error(err.message),
              }
            )
          }
          isApproving={isApproving}
          isRejecting={isRejecting}
          isExecuting={isExecuting}
        />
      )}
    </div>
  );
}

// ─── Proposal Row ─────────────────────────────────────────────

function ProposalRow({
  proposal,
  onSelect,
}: {
  proposal: MultiSigProposal;
  onSelect: () => void;
}) {
  const cfg = STATUS_CONFIG[proposal.status];
  const progress =
    (proposal.approvals.length / proposal.requiredApprovals) * 100;

  return (
    <div
      className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-0 cursor-pointer hover:bg-slate-800/30 rounded-lg px-2 -mx-2 transition-colors"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}
          >
            {cfg.icon}
            {cfg.label}
          </span>
          <span className="text-xs text-slate-500">
            {formatDistanceToNow(new Date(proposal.proposedAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-slate-200 truncate">
          Send {proposal.transaction.amount} {proposal.transaction.asset} →{" "}
          {shortenAddress(proposal.transaction.destination, 6)}
        </p>
        {proposal.status === "open" && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">
              {proposal.approvals.length}/{proposal.requiredApprovals}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Proposal Modal ────────────────────────────────────

function CreateProposalModal({
  isOpen,
  onClose,
  onCreate,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    destination: string;
    amount: string;
    asset: string;
    memo?: string;
  }) => void;
  isLoading: boolean;
}) {
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("XLM");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidPublicKey(destination.trim())) {
      setError("Invalid destination address");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Invalid amount");
      return;
    }
    onCreate({
      destination: destination.trim(),
      amount,
      asset,
      memo: memo.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Multi-Sig Proposal"
      description="Propose a transaction requiring multiple approvals"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Destination <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="G..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Amount <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.0000001"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Asset
            </label>
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500"
            >
              <option value="XLM">XLM</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Memo (optional)
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Payment reference"
            maxLength={28}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500"
          />
        </div>
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Proposal
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Proposal Detail Modal ────────────────────────────────────

function ProposalDetailModal({
  proposal,
  onClose,
  onApprove,
  onReject,
  onExecute,
  isApproving,
  isRejecting,
  isExecuting,
}: {
  proposal: MultiSigProposal;
  onClose: () => void;
  onApprove: (key: string) => void;
  onReject: (key: string) => void;
  onExecute: (key: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
  isExecuting: boolean;
}) {
  const [signerKey, setSignerKey] = useState("");
  const cfg = STATUS_CONFIG[proposal.status];
  const canExecute =
    proposal.status === "approved" &&
    proposal.approvals.length >= proposal.requiredApprovals;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Proposal Details"
      size="lg"
    >
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${cfg.color} ${cfg.bg}`}
          >
            {cfg.icon}
            {cfg.label}
          </span>
          <span className="text-xs text-slate-500">
            Proposed {formatDistanceToNow(new Date(proposal.proposedAt), { addSuffix: true })}
          </span>
        </div>

        {/* Transaction details */}
        <div className="bg-slate-900/60 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Destination</span>
            <span className="font-mono text-slate-200">
              {shortenAddress(proposal.transaction.destination, 8)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Amount</span>
            <span className="text-slate-200 font-semibold">
              {proposal.transaction.amount} {proposal.transaction.asset}
            </span>
          </div>
          {proposal.transaction.memo && (
            <div className="flex justify-between">
              <span className="text-slate-400">Memo</span>
              <span className="text-slate-200">{proposal.transaction.memo}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400">Approvals</span>
            <span className="text-slate-200">
              {proposal.approvals.length} / {proposal.requiredApprovals}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Expires</span>
            <span className="text-slate-200">
              {format(new Date(proposal.expiresAt), "MMM d, yyyy HH:mm")}
            </span>
          </div>
        </div>

        {/* Signer key input (for open proposals) */}
        {proposal.status === "open" && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Your Secret Key (to sign)
            </label>
            <input
              type="password"
              value={signerKey}
              onChange={(e) => setSignerKey(e.target.value)}
              placeholder="S..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500"
              autoComplete="off"
            />
          </div>
        )}

        {/* Actions */}
        {proposal.status === "open" && (
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => onReject(signerKey)}
              isLoading={isRejecting}
              leftIcon={<ThumbsDown className="w-3.5 h-3.5" />}
            >
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => onApprove(signerKey)}
              isLoading={isApproving}
              leftIcon={<ThumbsUp className="w-3.5 h-3.5" />}
            >
              Approve
            </Button>
          </div>
        )}

        {canExecute && (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => onExecute(signerKey)}
              isLoading={isExecuting}
              leftIcon={<Play className="w-3.5 h-3.5" />}
            >
              Execute Transaction
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
