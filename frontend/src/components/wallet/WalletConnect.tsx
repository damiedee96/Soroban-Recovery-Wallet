"use client";

import React, { useState } from "react";
import { Wallet, Key, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useWallet } from "@/hooks/useWallet";
import { isValidPublicKey, generateKeypair } from "@/lib/stellar";
import toast from "react-hot-toast";

export function WalletConnect() {
  const { connect, isLoading, error } = useWallet();
  const [secretKey, setSecretKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [mode, setMode] = useState<"connect" | "generate">("connect");
  const [generatedKeypair, setGeneratedKeypair] = useState<{
    publicKey: string;
    secretKey: string;
  } | null>(null);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey.trim()) {
      toast.error("Please enter your secret key");
      return;
    }
    connect(secretKey.trim());
  };

  const handleGenerate = () => {
    const kp = generateKeypair();
    setGeneratedKeypair(kp);
    toast.success("Keypair generated! Fund it on testnet before use.");
  };

  const handleCopyPublicKey = () => {
    if (generatedKeypair) {
      navigator.clipboard.writeText(generatedKeypair.publicKey);
      toast.success("Public key copied");
    }
  };

  return (
    <div className="min-h-screen bg-stellar-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-stellar-600/20 border border-stellar-500/30 rounded-2xl mb-4">
            <Wallet className="w-8 h-8 text-stellar-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Recovery Wallet</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Soroban-powered wallet with social recovery
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-slate-800/50 rounded-xl p-1 mb-6">
          <button
            onClick={() => setMode("connect")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === "connect"
                ? "bg-stellar-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Connect Wallet
          </button>
          <button
            onClick={() => setMode("generate")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === "generate"
                ? "bg-stellar-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            New Wallet
          </button>
        </div>

        {mode === "connect" ? (
          <Card>
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label
                  htmlFor="secret-key"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Secret Key
                </label>
                <div className="relative">
                  <input
                    id="secret-key"
                    type={showKey ? "text" : "password"}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="S..."
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 pr-10 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-stellar-500 focus:border-transparent"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label={showKey ? "Hide secret key" : "Show secret key"}
                  >
                    {showKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-900/50 rounded-lg p-3">
                <Key className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Your secret key never leaves your browser. It is held in
                  memory only and cleared on disconnect.
                </span>
              </div>

              <Button
                type="submit"
                fullWidth
                isLoading={isLoading}
                size="lg"
              >
                Connect
              </Button>
            </form>
          </Card>
        ) : (
          <Card>
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Generate a new Stellar keypair. After generating, fund the
                account on testnet using Friendbot before connecting.
              </p>

              {generatedKeypair ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Public Key</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-green-400 font-mono break-all">
                        {generatedKeypair.publicKey}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyPublicKey}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Secret Key</p>
                    <code className="block text-xs bg-slate-900 border border-red-800/30 rounded-lg px-3 py-2 text-red-400 font-mono break-all">
                      {generatedKeypair.secretKey}
                    </code>
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Save this secret key securely — it cannot be recovered.
                    </p>
                  </div>
                  <a
                    href={`https://friendbot.stellar.org?addr=${generatedKeypair.publicKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" fullWidth size="sm">
                      Fund on Testnet (Friendbot) ↗
                    </Button>
                  </a>
                  <Button
                    fullWidth
                    onClick={() => {
                      setSecretKey(generatedKeypair.secretKey);
                      setMode("connect");
                    }}
                  >
                    Use This Wallet
                  </Button>
                </div>
              ) : (
                <Button fullWidth onClick={handleGenerate} size="lg">
                  Generate Keypair
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
