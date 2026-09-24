"use client";
import { useState } from "react";
import { ChevronDown, CircleDot, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useInjectedWallet } from "@/lib/wallet";
import { short } from "@/lib/format";

export function WalletButton() {
  const wallet = useInjectedWallet();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  async function act() {
    setBusy(true);
    try {
      if (!wallet.connected) await wallet.connect();
      else if (!wallet.correctNetwork) await wallet.switchNetwork();
      else await wallet.refresh();
      toast.success("Studionet wallet ready");
    } catch (e: any) { toast.error(e?.message || "Wallet request failed"); }
    finally { setBusy(false); }
  }
  if (!wallet.ready) return <button className="wallet-button muted" disabled>checking wallet</button>;
  if (!wallet.connected) return <button className="wallet-button" onClick={act} disabled={busy}><Wallet size={15}/>{busy ? "opening" : "connect wallet"}</button>;
  return <div className="wallet-wrap">
    <button className={`wallet-button ${wallet.correctNetwork ? "" : "danger"}`} onClick={act}><CircleDot size={14}/>{wallet.correctNetwork ? short(wallet.address || "") : "switch to 61999"}</button>
    <button className="wallet-chevron" onClick={() => setOpen(v => !v)} aria-expanded={open}><ChevronDown size={14}/></button>
    {open ? <div className="wallet-menu"><span>{short(wallet.address || "", 10, 8)}</span><button onClick={() => { wallet.disconnect(); setOpen(false); }}>disconnect from app</button></div> : null}
  </div>;
}
