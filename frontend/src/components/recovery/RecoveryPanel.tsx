"use client";

import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Ban,
  ThumbsUp,
  History,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { useRecovery } from "@/hooks/useRecovery";
import { useGuardians } from "@/hooks/useGuardians";
import { isValidPublicKey, shortenAddress } from "@/lib/stellar";
import { formatDistanceToNow, format } from "date-fns";
import toast from "react-hot-toast";
import type { RecoveryRequest, RecoveryStatus } from "@/types";

const STATUS_CONFIG: Record<
  RecoveryStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  none: { label: "None", color: "text-slate-400", icon: null },
  pending: {
    label: "Pending",
    color: "text-yellow-400",
    icon: <Clock className="w-4 h-4" />,
  },
  approved: {
    label: "Approved",
    color: "text-green-400",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  executed: {
    label: "Executed",
    color: "text-stellar-400",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-slate-400",
    icon: <XCircle className="w-4 h-4" />,
  },
  expired: {
    label: "Expired",
    color: "text-red-400",
    icon: <XCircle className="w-4 h-4" />,
  },
};

export function RecoveryPanel() {
  const {
    activeRequest,
    history,
    timeRemaining,
    canExecute,
    isLoading,
    initiateRecovery,
    cancelRecovery,
    executeRecovery,
    isInitiating,
    isCancelling,
    isExecuting,
  } = useRecovery();

  const { guardians, threshold } = useGuardians();

  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Active Request */}
      {activeRequest ? (
        <ActiveRecoveryCard
          request={activeRequest}
          timeRemaining={timeRemaining}
          canExecute={canExecute}
          threshold={threshold}
          onCancel={() => setShowCancelConfirm(true)}
          onExecute={() => setShowExecuteConfirm(true)}
          onApprove={() => setShowApproveModal(true)}
          isCancelling={isCancelling}
          isExecuting={isExecuting}
        />
      ) : (
        <Card>
          <div className="py-8 text-center">
            <RotateCcw className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-300 font-medium">No active recovery request</p>
            <p className="text-slate-500 text-sm mt-1 mb-5">
              Initiate a recovery if you need to transfer wallet ownership.
            </p>
            <Button
              onClick={() => setShowInitiateModal(true)}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Initiate Recovery
            </Button>
          </div>
        </Card>
      )}

      {/* Guardian info */}
      {guardians.length === 0 && (
        <div className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-700/30 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-300">
            No guardians configured. Add guardians in the Guardians tab before
            initiating recovery.
          </p>
        </div>
      )}

      {/* Recovery History */}
      {history.length > 0 && (
        <Card>
          <CardHeader
            title="Recovery History"
            icon={<History className="w-4 h-4" />}
          />
          <CardBody>
            {history.map((req) => (
              <RecoveryHistoryRow key={req.id} request={req} />
            ))}
          </CardBody>
        </Card>
      )}

      {/* Initiate Modal */}
      <InitiateRecoveryModal
        isOpen={showInitiateModal}
        onClose={() => setShowInitiateModal(false)}
        onInitiate={(newOwner) => {
          initiateRecovery(newOwner, {
            onSuccess: () => {
              setShowInitiateModal(false);
              toast.success("Recovery request initiated");
            },
            onError: (err: Error) => toast.error(err.message),
          });
        }}
        isLoading={isInitiating}
      />

      {/* Cancel Confirm */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={() => {
          cancelRecovery(undefined, {
            onSuccess: () => {
              setShowCancelConfirm(false);
              toast.success("Recovery request cancelled");
            },
            onError: (err: Error) => toast.error(err.message),
          });
        }}
        title="Cancel Recovery"
        message="Cancel the active recovery request? This action cannot be undone."
        confirmLabel="Cancel Recovery"
        variant="danger"
        isLoading={isCancelling}
      />

      {/* Execute Confirm */}
      <ConfirmModal
        isOpen={showExecuteConfirm}
        onClose={() => setShowExecuteConfirm(false)}
        onConfirm={() => {
          // In a real flow the executor provides their key
          executeRecovery("", {
            onSuccess: () => {
              setShowExecuteConfirm(false);
              toast.success("Recovery executed successfully");
            },
            onError: (err: Error) => toast.error(err.message),
          });
        }}
        title="Execute Recovery"
        message="Execute the recovery and transfer wallet ownership to the new address?"
        confirmLabel="Execute"
        isLoading={isExecuting}
      />

      {/* Guardian Approve Modal */}
      <GuardianApproveModal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        requestId={activeRequest?.id ?? ""}
      />
    </div>
  );
}

// ─── Active Recovery Card ─────────────────────────────────────

function ActiveRecoveryCard({
  request,
  timeRemaining,
  canExecute,
  threshold,
  onCancel,
  onExecute,
  onApprove,
  isCancelling,
  isExecuting,
}: {
  request: RecoveryRequest;
  timeRemaining: number;
  canExecute: boolean;
  threshold: number;
  onCancel: () => void;
  onExecute: () => void;
  onApprove: () => void;
  isCancelling: boolean;
  isExecuting: boolean;
}) {
  const [countdown, setCountdown] = useState(timeRemaining);
  const statusCfg = STATUS_CONFIG[request.status];

  useEffect(() => {
    if (timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining]);

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const approvalProgress = (request.approvals.length / threshold) * 100;

  return (
    <Card glow="yellow">
      <CardHeader
        title="Active Recovery Request"
        icon={<RotateCcw className="w-4 h-4" />}
        action={
          <span className={`flex items-center gap-1.5 text-sm font-medium ${statusCfg.color}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        }
      />

      <div className="space-y-4">
        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500 text-xs">New Owner</p>
            <p className="font-mono text-slate-200 text-xs mt-0.5">
              {shortenAddress(request.newOwner, 8)}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Initiated By</p>
            <p className="font-mono text-slate-200 text-xs mt-0.5">
              {shortenAddress(request.initiatedBy, 8)}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Initiated</p>
            <p className="text-slate-200 text-xs mt-0.5">
              {format(new Date(request.initiatedAt), "MMM d, yyyy HH:mm")}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Executable After</p>
            <p className="text-slate-200 text-xs mt-0.5">
              {format(new Date(request.executeAfter), "MMM d, yyyy HH:mm")}
            </p>
          </div>
        </div>

        {/* Time delay countdown */}
        {countdown > 0 && (
          <div className="bg-slate-900/60 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Time remaining before execution</p>
            <p className="text-2xl font-mono font-bold text-yellow-400">
              {formatCountdown(countdown)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Cancel this request if you did not initiate it
            </p>
          </div>
        )}

        {/* Approval progress */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Guardian Approvals</span>
            <span>
              {request.approvals.length} / {threshold} required
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, approvalProgress)}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onApprove}
            leftIcon={<ThumbsUp className="w-3.5 h-3.5" />}
          >
            Approve (Guardian)
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onCancel}
            isLoading={isCancelling}
            leftIcon={<Ban className="w-3.5 h-3.5" />}
          >
            Cancel
          </Button>
          {canExecute && (
            <Button
              size="sm"
              onClick={onExecute}
              isLoading={isExecuting}
              leftIcon={<Play className="w-3.5 h-3.5" />}
            >
              Execute
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── History Row ──────────────────────────────────────────────

function RecoveryHistoryRow({ request }: { request: RecoveryRequest }) {
  const cfg = STATUS_CONFIG[request.status];
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`${cfg.color}`}>{cfg.icon}</div>
        <div>
          <p className="text-sm text-slate-200">
            Recovery → {shortenAddress(request.newOwner, 6)}
          </p>
          <p className="text-xs text-slate-500">
            {formatDistanceToNow(new Date(request.initiatedAt), { addSuffix: true })}
          </p>
        </div>
      </div>
      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
    </div>
  );
}

// ─── Initiate Modal ───────────────────────────────────────────

function InitiateRecoveryModal({
  isOpen,
  onClose,
  onInitiate,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInitiate: (newOwner: string) => void;
  isLoading: boolean;
}) {
  const [newOwner, setNewOwner] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidPublicKey(newOwner.trim())) {
      setError("Invalid Stellar public key");
      return;
    }
    onInitiate(newOwner.trim());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Initiate Recovery"
      description="Start a recovery request to transfer wallet ownership"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl px-4 py-3">
          <p className="text-sm text-yellow-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            A time delay will apply before recovery can be executed. You can
            cancel this request at any time during the delay window.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            New Owner Address <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={newOwner}
            onChange={(e) => setNewOwner(e.target.value)}
            placeholder="G..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500"
            spellCheck={false}
          />
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Initiate Recovery
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Guardian Approve Modal ───────────────────────────────────

function GuardianApproveModal({
  isOpen,
  onClose,
  requestId,
}: {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
}) {
  const { approveRecovery, isApproving } = useRecovery();
  const [guardianKey, setGuardianKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    approveRecovery(
      { requestId, guardianSecretKey: guardianKey.trim() },
      {
        onSuccess: () => {
          onClose();
          toast.success("Approval submitted");
        },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Approve Recovery (Guardian)"
      description="Sign the recovery approval with your guardian secret key"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Guardian Secret Key
          </label>
          <input
            type={showKey ? "text" : "password"}
            value={guardianKey}
            onChange={(e) => setGuardianKey(e.target.value)}
            placeholder="S..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={isApproving}>
            Approve
          </Button>
        </div>
      </form>
    </Modal>
  );
}
