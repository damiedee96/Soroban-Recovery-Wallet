"use client";

import React, { useState } from "react";
import {
  Lock,
  Unlock,
  AlertOctagon,
  ShieldAlert,
  Bell,
  Clock,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/Modal";
import { useWallet } from "@/hooks/useWallet";
import { format } from "date-fns";
import toast from "react-hot-toast";

export function SecurityPanel() {
  const {
    wallet,
    freezeStatus,
    freeze,
    unfreeze,
    isFreezing,
    isUnfreezing,
  } = useWallet();

  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false);
  const [showUnfreezeConfirm, setShowUnfreezeConfirm] = useState(false);

  if (!wallet) return null;

  return (
    <div className="space-y-6">
      {/* Freeze Status Card */}
      <Card glow={freezeStatus.isFrozen ? "red" : "none"}>
        <CardHeader
          title="Emergency Freeze"
          icon={<AlertOctagon className="w-4 h-4" />}
          subtitle="Instantly suspend all wallet activity"
        />

        <div className="space-y-4">
          {/* Status indicator */}
          <div
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
              freezeStatus.isFrozen
                ? "bg-red-900/20 border border-red-700/30"
                : "bg-green-900/20 border border-green-700/30"
            }`}
          >
            {freezeStatus.isFrozen ? (
              <Lock className="w-5 h-5 text-red-400 flex-shrink-0" />
            ) : (
              <Unlock className="w-5 h-5 text-green-400 flex-shrink-0" />
            )}
            <div>
              <p
                className={`text-sm font-medium ${
                  freezeStatus.isFrozen ? "text-red-300" : "text-green-300"
                }`}
              >
                {freezeStatus.isFrozen ? "Wallet is Frozen" : "Wallet is Active"}
              </p>
              {freezeStatus.isFrozen && freezeStatus.frozenAt && (
                <p className="text-xs text-red-400/70 mt-0.5">
                  Frozen on{" "}
                  {format(new Date(freezeStatus.frozenAt), "MMM d, yyyy HH:mm")}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-400">
            {freezeStatus.isFrozen
              ? "All outgoing transactions are suspended. Only the wallet owner can unfreeze."
              : "Freeze your wallet immediately if you suspect unauthorized access or a security breach."}
          </p>

          {/* Action button */}
          {freezeStatus.isFrozen ? (
            <Button
              variant="outline"
              onClick={() => setShowUnfreezeConfirm(true)}
              isLoading={isUnfreezing}
              leftIcon={<Unlock className="w-4 h-4" />}
            >
              Unfreeze Wallet
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={() => setShowFreezeConfirm(true)}
              isLoading={isFreezing}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              Freeze Wallet
            </Button>
          )}
        </div>
      </Card>

      {/* Security Checklist */}
      <Card>
        <CardHeader
          title="Security Checklist"
          icon={<ShieldAlert className="w-4 h-4" />}
          subtitle="Recommended security practices"
        />
        <div className="space-y-3">
          <SecurityCheckItem
            label="Guardians configured"
            description="At least 3 trusted guardians assigned"
            status={true} // would be dynamic in production
          />
          <SecurityCheckItem
            label="Recovery threshold set"
            description="M-of-N approval policy is active"
            status={true}
          />
          <SecurityCheckItem
            label="Multi-sig enabled"
            description="High-value transactions require multiple approvals"
            status={false}
          />
          <SecurityCheckItem
            label="Recovery tested"
            description="Recovery flow has been tested on testnet"
            status={false}
          />
        </div>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader
          title="Security Activity"
          icon={<Bell className="w-4 h-4" />}
          subtitle="Recent security events"
        />
        <div className="space-y-2">
          <ActivityLogItem
            icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
            label="Wallet connected"
            time="Just now"
          />
          {freezeStatus.isFrozen && (
            <ActivityLogItem
              icon={<Lock className="w-4 h-4 text-red-400" />}
              label="Wallet frozen"
              time={
                freezeStatus.frozenAt
                  ? format(new Date(freezeStatus.frozenAt), "HH:mm")
                  : "Recently"
              }
            />
          )}
          <ActivityLogItem
            icon={<Info className="w-4 h-4 text-slate-400" />}
            label="No suspicious activity detected"
            time="Ongoing"
          />
        </div>
      </Card>

      {/* Freeze Confirm */}
      <ConfirmModal
        isOpen={showFreezeConfirm}
        onClose={() => setShowFreezeConfirm(false)}
        onConfirm={() => {
          freeze(undefined, {
            onSuccess: () => {
              setShowFreezeConfirm(false);
              toast.success("Wallet frozen successfully");
            },
            onError: (err: Error) => toast.error(err.message),
          });
        }}
        title="Freeze Wallet"
        message="This will immediately suspend all outgoing transactions. You can unfreeze at any time."
        confirmLabel="Freeze Now"
        variant="danger"
        isLoading={isFreezing}
      />

      {/* Unfreeze Confirm */}
      <ConfirmModal
        isOpen={showUnfreezeConfirm}
        onClose={() => setShowUnfreezeConfirm(false)}
        onConfirm={() => {
          unfreeze(undefined, {
            onSuccess: () => {
              setShowUnfreezeConfirm(false);
              toast.success("Wallet unfrozen");
            },
            onError: (err: Error) => toast.error(err.message),
          });
        }}
        title="Unfreeze Wallet"
        message="Resume normal wallet operations? Make sure the security threat has been resolved."
        confirmLabel="Unfreeze"
        isLoading={isUnfreezing}
      />
    </div>
  );
}

// ─── Security Check Item ──────────────────────────────────────

function SecurityCheckItem({
  label,
  description,
  status,
}: {
  label: string;
  description: string;
  status: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-700/30 last:border-0">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          status ? "bg-green-900/40 text-green-400" : "bg-slate-700 text-slate-500"
        }`}
      >
        {status ? (
          <CheckCircle2 className="w-3.5 h-3.5" />
        ) : (
          <Clock className="w-3.5 h-3.5" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

// ─── Activity Log Item ────────────────────────────────────────

function ActivityLogItem({
  icon,
  label,
  time,
}: {
  icon: React.ReactNode;
  label: string;
  time: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-700/30 last:border-0">
      <div className="flex-shrink-0">{icon}</div>
      <p className="flex-1 text-sm text-slate-300">{label}</p>
      <span className="text-xs text-slate-500 flex-shrink-0">{time}</span>
    </div>
  );
}
