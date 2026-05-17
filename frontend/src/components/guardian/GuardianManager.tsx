"use client";

import React, { useState } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { useGuardians } from "@/hooks/useGuardians";
import { isValidPublicKey, shortenAddress } from "@/lib/stellar";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import type { Guardian } from "@/types";

export function GuardianManager() {
  const {
    guardians,
    threshold,
    totalGuardians,
    isLoading,
    addGuardian,
    removeGuardian,
    setThreshold,
    isAdding,
    isRemoving,
  } = useGuardians();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Guardian | null>(null);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card glow="blue">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-stellar-600/20 rounded-xl">
              <Users className="w-5 h-5 text-stellar-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Guardians</p>
              <p className="text-2xl font-bold text-white">{totalGuardians}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-900/30 rounded-xl">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Required Approvals</p>
              <p className="text-2xl font-bold text-white">{threshold}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-900/30 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Recovery Policy</p>
              <p className="text-lg font-bold text-white">
                {threshold}-of-{totalGuardians}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Guardian List */}
      <Card>
        <CardHeader
          title="Trusted Guardians"
          subtitle="Guardians can collectively authorize wallet recovery"
          icon={<Users className="w-4 h-4" />}
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowThresholdModal(true)}
                leftIcon={<Settings className="w-3.5 h-3.5" />}
              >
                Threshold
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddModal(true)}
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Add Guardian
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            Loading guardians…
          </div>
        ) : guardians.length === 0 ? (
          <div className="py-10 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 font-medium">No guardians assigned</p>
            <p className="text-slate-500 text-sm mt-1">
              Add trusted contacts who can help recover your wallet.
            </p>
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setShowAddModal(true)}
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Add First Guardian
            </Button>
          </div>
        ) : (
          <CardBody>
            {guardians.map((guardian) => (
              <GuardianRow
                key={guardian.address}
                guardian={guardian}
                onRemove={() => setRemoveTarget(guardian)}
                isRemoving={isRemoving}
              />
            ))}
          </CardBody>
        )}
      </Card>

      {/* Security note */}
      {totalGuardians > 0 && totalGuardians < 3 && (
        <div className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-700/30 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-300">
              Recommendation: Add at least 3 guardians
            </p>
            <p className="text-xs text-yellow-400/70 mt-0.5">
              More guardians reduce the risk of a single point of failure in
              your recovery setup.
            </p>
          </div>
        </div>
      )}

      {/* Add Guardian Modal */}
      <AddGuardianModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(address, alias) => {
          addGuardian(
            { guardianAddress: address, alias },
            {
              onSuccess: () => {
                setShowAddModal(false);
                toast.success("Guardian added successfully");
              },
              onError: (err: Error) => toast.error(err.message),
            }
          );
        }}
        isLoading={isAdding}
      />

      {/* Threshold Modal */}
      <ThresholdModal
        isOpen={showThresholdModal}
        onClose={() => setShowThresholdModal(false)}
        currentThreshold={threshold}
        maxThreshold={totalGuardians}
        onSave={(t) => {
          setThreshold(t, {
            onSuccess: () => {
              setShowThresholdModal(false);
              toast.success("Threshold updated");
            },
            onError: (err: Error) => toast.error(err.message),
          });
        }}
      />

      {/* Remove Confirm */}
      <ConfirmModal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) {
            removeGuardian(removeTarget.address, {
              onSuccess: () => {
                setRemoveTarget(null);
                toast.success("Guardian removed");
              },
              onError: (err: Error) => toast.error(err.message),
            });
          }
        }}
        title="Remove Guardian"
        message={`Remove ${
          removeTarget?.alias ?? shortenAddress(removeTarget?.address ?? "")
        } as a guardian? This will update your on-chain recovery policy.`}
        confirmLabel="Remove"
        variant="danger"
        isLoading={isRemoving}
      />
    </div>
  );
}

// ─── Guardian Row ─────────────────────────────────────────────

function GuardianRow({
  guardian,
  onRemove,
  isRemoving,
}: {
  guardian: Guardian;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-stellar-600/10 border border-stellar-500/20 rounded-full flex items-center justify-center">
          <Users className="w-4 h-4 text-stellar-400" />
        </div>
        <div>
          {guardian.alias && (
            <p className="text-sm font-medium text-slate-200">{guardian.alias}</p>
          )}
          <p className="text-xs font-mono text-slate-400">
            {shortenAddress(guardian.address, 8)}
          </p>
          <p className="text-xs text-slate-600">
            Added {formatDistanceToNow(new Date(guardian.addedAt), { addSuffix: true })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            guardian.isActive
              ? "bg-green-900/30 text-green-400"
              : "bg-slate-700 text-slate-400"
          }`}
        >
          {guardian.isActive ? "Active" : "Inactive"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          isLoading={isRemoving}
          leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
          aria-label={`Remove guardian ${guardian.alias ?? guardian.address}`}
        />
      </div>
    </div>
  );
}

// ─── Add Guardian Modal ───────────────────────────────────────

function AddGuardianModal({
  isOpen,
  onClose,
  onAdd,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (address: string, alias?: string) => void;
  isLoading: boolean;
}) {
  const [address, setAddress] = useState("");
  const [alias, setAlias] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidPublicKey(address.trim())) {
      setError("Invalid Stellar public key");
      return;
    }
    onAdd(address.trim(), alias.trim() || undefined);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Guardian"
      description="Add a trusted contact who can help recover your wallet"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Guardian Address <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="G..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500"
            spellCheck={false}
          />
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Alias (optional)
          </label>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="e.g. Alice, Backup Account"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500"
          />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Add Guardian
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Threshold Modal ──────────────────────────────────────────

function ThresholdModal({
  isOpen,
  onClose,
  currentThreshold,
  maxThreshold,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentThreshold: number;
  maxThreshold: number;
  onSave: (threshold: number) => void;
}) {
  const [value, setValue] = useState(currentThreshold);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Recovery Threshold"
      description="Set how many guardians must approve a recovery request"
      size="sm"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Required approvals (1–{maxThreshold})
          </label>
          <input
            type="number"
            min={1}
            max={maxThreshold}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Current: {currentThreshold}-of-{maxThreshold}
          </p>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={() => onSave(value)}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
