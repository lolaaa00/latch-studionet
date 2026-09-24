import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatGen, short, timeLeft } from "@/lib/format";
import { StatusPill } from "./StatusPill";

export function WorkOrderCard({ bounty }: { bounty: any }) {
  const repo = String(bounty.repository_url || "").replace("https://github.com/", "");
  return <Link href={`/bounties/${bounty.id}`} className="work-card">
    <div className="work-card-top"><span className="serial">{bounty.id}</span><StatusPill status={bounty.status}/></div>
    <div className="work-card-body"><small>{repo || "public repository"}</small><h3>{bounty.title}</h3></div>
    <div className="work-card-grid">
      <div><label>bounty</label><strong>{formatGen(bounty.bounty_atto || "0")} GEN</strong></div>
      <div><label>submissions</label><strong>{bounty.submission_count || 0}</strong></div>
      <div><label>window</label><strong>{timeLeft(bounty.closes_at)}</strong></div>
      <div><label>winner</label><strong>{short(bounty.winner)}</strong></div>
    </div>
    <div className="work-card-foot">open work order <ArrowUpRight size={15}/></div>
  </Link>;
}
