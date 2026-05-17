import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Allow images from Stellar ecosystem domains
  images: {
    domains: ["stellar.org", "soroban.stellar.org"],
  },

  // Expose only NEXT_PUBLIC_ vars to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOROBAN_RPC_URL: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL,
    NEXT_PUBLIC_HORIZON_URL: process.env.NEXT_PUBLIC_HORIZON_URL,
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
    NEXT_PUBLIC_RECOVERY_WALLET_CONTRACT_ID:
      process.env.NEXT_PUBLIC_RECOVERY_WALLET_CONTRACT_ID,
    NEXT_PUBLIC_GUARDIAN_REGISTRY_CONTRACT_ID:
      process.env.NEXT_PUBLIC_GUARDIAN_REGISTRY_CONTRACT_ID,
    NEXT_PUBLIC_MULTISIG_CONTRACT_ID:
      process.env.NEXT_PUBLIC_MULTISIG_CONTRACT_ID,
  },

  // Webpack config for Stellar SDK (uses Node.js built-ins)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        buffer: require.resolve("buffer"),
      };
    }
    return config;
  },
};

export default nextConfig;
