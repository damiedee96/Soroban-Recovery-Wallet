"use client";

import React, { useState } from "react";
import {
  Wallet,
  Shield,
  Users,
  RotateCcw,
  Lock,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { WalletDashboard } from "@/components/wallet/WalletDashboard";
import { GuardianManager } from "@/components/guardian/GuardianManager";
import { RecoveryPanel } from "@/components/recovery/RecoveryPanel";
import { MultiSigPanel } from "@/components/multisig/MultiSigPanel";
import { SecurityPanel } from "@/components/security/SecurityPanel";
import { useWalletStore } from "@/store/walletStore";
import { shortenAddress } from "@/lib/stellar";

type Tab = "wallet" | "guardians" | "recovery" | "multisig" | "security";

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: "wallet",
    label: "Wallet",
    icon: <Wallet className="w-5 h-5" />,
    description: "Balance & transactions",
  },
  {
    id: "guardians",
    label: "Guardians",
    icon: <Users className="w-5 h-5" />,
    description: "Manage trusted guardians",
  },
  {
    id: "recovery",
    label: "Recovery",
    icon: <RotateCcw className="w-5 h-5" />,
    description: "Social recovery flow",
  },
  {
    id: "multisig",
    label: "Multi-Sig",
    icon: <Shield className="w-5 h-5" />,
    description: "Multi-signature proposals",
  },
  {
    id: "security",
    label: "Security",
    icon: <Lock className="w-5 h-5" />,
    description: "Freeze & emergency controls",
  },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("wallet");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const wallet = useWalletStore((s) => s.wallet);

  const activeItem = NAV_ITEMS.find((n) => n.id === activeTab)!;

  return (
    <div className="min-h-screen bg-stellar-gradient flex">
      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900/95 backdrop-blur border-r border-slate-800",
          "flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-9 h-9 bg-stellar-600/20 border border-stellar-500/30 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-stellar-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Recovery Wallet</p>
            <p className="text-xs text-slate-500">Soroban · Stellar</p>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wallet address pill */}
        {wallet && (
          <div className="mx-4 mt-4 px-3 py-2 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-500 mb-0.5">Connected</p>
            <p className="text-xs font-mono text-stellar-400 truncate">
              {shortenAddress(wallet.address, 6)}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                activeTab === item.id
                  ? "bg-stellar-600/20 text-stellar-400 border border-stellar-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
              aria-current={activeTab === item.id ? "page" : undefined}
            >
              {item.icon}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-slate-500 truncate">{item.description}</p>
              </div>
              {activeTab === item.id && (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-600">
            Soroban Recovery Wallet v0.1.0
          </p>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 lg:px-6 py-4 flex items-center gap-4">
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-white">
              {activeItem.label}
            </h1>
            <p className="text-xs text-slate-500">{activeItem.description}</p>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 max-w-4xl w-full mx-auto">
          {activeTab === "wallet" && <WalletDashboard />}
          {activeTab === "guardians" && <GuardianManager />}
          {activeTab === "recovery" && <RecoveryPanel />}
          {activeTab === "multisig" && <MultiSigPanel />}
          {activeTab === "security" && <SecurityPanel />}
        </main>
      </div>
    </div>
  );
}
