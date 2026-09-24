import Link from "next/link";
export default function NotFound(){return <div className="shell"><div className="empty-state"><strong>Work order not found.</strong><Link href="/bounties" className="secondary" style={{marginTop:18}}>return to market</Link></div></div>}
