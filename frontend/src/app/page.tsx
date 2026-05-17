"use client";

import React from "react";
import { useWalletStore } from "@/store/walletStore";
import { WalletConnect } from "@/components/wallet/WalletConnect";
import { AppShell } from "@/components/layout/AppShell";

export default function HomePage() {
  const isConnected = useWalletStore((s) => s.isConnected);

  if (!isConnected) {
    return <WalletConnect />;
  }

  return <AppShell />;
}
