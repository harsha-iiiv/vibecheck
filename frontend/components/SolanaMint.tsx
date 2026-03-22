"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE, VIBE_COLORS } from "@/lib/constants";
import type { VibeMood } from "@/lib/types";

interface Props {
  trackName: string;
  bpm: number;
  energyLevel: number;
  mood: VibeMood;
}

type MintState = "idle" | "connecting" | "registering" | "signing" | "success" | "error";

interface MintResult {
  mintId: string;
  txSignature: string;
  walletAddress: string;
  name: string;
}

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export function SolanaMint({ trackName, bpm, energyLevel, mood }: Props) {
  const [mintState, setMintState] = useState<MintState>("idle");
  const [result, setResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const colors = VIBE_COLORS[mood];

  const mint = useCallback(async () => {
    setMintState("connecting");
    setError(null);

    try {
      // 1. Connect Phantom wallet
      const provider = (window as Window & { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }>; publicKey?: { toString: () => string }; signAndSendTransaction?: (tx: unknown) => Promise<{ signature: string }> } }).solana;
      if (!provider) {
        throw new Error("Phantom wallet not found — install phantom.app");
      }

      const resp = await provider.connect();
      const walletAddress = resp.publicKey.toString();

      // 2. Register NFT metadata on backend
      setMintState("registering");
      const regRes = await fetch(`${API_BASE}/nft/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track_name: trackName || "AI Beat",
          mood,
          energy: energyLevel,
          bpm,
          wallet: walletAddress,
        }),
      });

      if (!regRes.ok) throw new Error("Failed to register NFT metadata");
      const { mint_id, name, metadata_url } = await regRes.json();

      // 3. Sign a Solana Memo transaction (real on-chain proof of ownership)
      setMintState("signing");

      // Dynamically import Solana web3 + Buffer polyfill (browser-safe)
      const [{ Connection, PublicKey, Transaction, TransactionInstruction }, { Buffer }] = await Promise.all([
        import("@solana/web3.js"),
        import("buffer"),
      ]);

      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      const { blockhash } = await connection.getLatestBlockhash();

      const pubkey = new PublicKey(walletAddress);
      const memoData = JSON.stringify({ mint_id, metadata_url, track: trackName, vibe: mood });

      const memoIx = new TransactionInstruction({
        keys: [{ pubkey, isSigner: true, isWritable: false }],
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(memoData, "utf8"),
      });

      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: pubkey });
      tx.add(memoIx);

      // signAndSendTransaction via Phantom
      if (!provider.signAndSendTransaction) throw new Error("Phantom version too old");
      const { signature } = await provider.signAndSendTransaction(tx);

      setResult({ mintId: mint_id, txSignature: signature, walletAddress, name });
      setMintState("success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Mint failed";
      setError(msg.includes("User rejected") ? "Wallet request cancelled" : msg);
      setMintState("error");
    }
  }, [trackName, mood, energyLevel, bpm]);

  const reset = useCallback(() => {
    setMintState("idle");
    setResult(null);
    setError(null);
  }, []);

  const explorerUrl = result
    ? `https://explorer.solana.com/tx/${result.txSignature}?cluster=devnet`
    : null;

  return (
    <AnimatePresence mode="wait">
      {mintState === "idle" && (
        <motion.button
          key="mint-btn"
          onClick={mint}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="w-full mt-3 py-2 rounded-xl text-xs font-black tracking-widest cursor-pointer flex items-center justify-center gap-2"
          style={{
            background: `linear-gradient(135deg, #9945FF, #14F195)`,
            color: "#07040F",
            boxShadow: "0 0 20px rgba(153,69,255,0.4)",
          }}
          whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(153,69,255,0.6)" }}
          whileTap={{ scale: 0.96 }}
          suppressHydrationWarning
        >
          ◎ MINT AS NFT
        </motion.button>
      )}

      {(mintState === "connecting" || mintState === "registering" || mintState === "signing") && (
        <motion.div
          key="minting"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="w-full mt-3 py-2 rounded-xl text-xs font-bold tracking-widest flex items-center justify-center gap-2"
          style={{
            background: "rgba(153,69,255,0.12)",
            border: "1px solid rgba(153,69,255,0.3)",
            color: "#9945FF",
          }}
        >
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            ◎
          </motion.span>
          {mintState === "connecting" && "CONNECTING WALLET..."}
          {mintState === "registering" && "REGISTERING METADATA..."}
          {mintState === "signing" && "SIGN IN PHANTOM..."}
        </motion.div>
      )}

      {mintState === "success" && result && (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="mt-3 rounded-xl p-3 flex flex-col gap-2"
          style={{
            background: "linear-gradient(135deg, rgba(153,69,255,0.12), rgba(20,241,149,0.08))",
            border: "1px solid rgba(153,69,255,0.3)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🎉</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-white truncate">{result.name}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {result.walletAddress.slice(0, 8)}...{result.walletAddress.slice(-6)}
              </div>
            </div>
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(20,241,149,0.15)", color: "#14F195", border: "1px solid rgba(20,241,149,0.3)" }}
            >
              MINTED
            </span>
          </div>

          <div className="flex gap-2">
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-center cursor-pointer"
                style={{
                  background: "rgba(153,69,255,0.18)",
                  color: "#9945FF",
                  border: "1px solid rgba(153,69,255,0.3)",
                  textDecoration: "none",
                }}
              >
                ◎ VIEW ON EXPLORER
              </a>
            )}
            <button
              onClick={reset}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#64748B",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              suppressHydrationWarning
            >
              RESET
            </button>
          </div>
        </motion.div>
      )}

      {mintState === "error" && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-3 rounded-xl p-2 flex items-center gap-2"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <span className="text-[10px] text-red-400 flex-1">{error}</span>
          <button
            onClick={reset}
            className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer"
            style={{ background: "rgba(255,255,255,0.05)", color: "#94A3B8" }}
            suppressHydrationWarning
          >
            RETRY
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
