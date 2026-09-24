import Link from "next/link";
import { LatchMark } from "./LatchMark";
import { WalletButton } from "./WalletButton";

export function SiteHeader() {
  return <header className="site-header">
    <Link href="/" className="brand"><LatchMark/><span>LATCH</span><em>repair market</em></Link>
    <nav>
      <Link href="/bounties">work orders</Link>
      <Link href="/certificates">certificates</Link>
      <Link href="/workbench">workbench</Link>
      <Link href="/protocol">protocol</Link>
    </nav>
    <div className="header-actions"><span className="network-chip">61999 / STUDIO</span><WalletButton/></div>
  </header>;
}
