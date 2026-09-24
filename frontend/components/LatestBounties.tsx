"use client";
import { useEffect, useState } from "react";
import { listBounties } from "@/lib/latch";
import { WorkOrderCard } from "./WorkOrderCard";

export function LatestBounties() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { listBounties(0, 6).then((r:any) => setItems((r?.items || []).slice().reverse())).catch(e => setError(e.message)); }, []);
  if (error) return <div className="error-box">Live market unavailable: {error}</div>;
  if (!items.length) return <div className="empty-state"><strong>No work orders yet.</strong>Open the first public repair bounty on the canonical contract.</div>;
  return <div className="work-grid">{items.map(x => <WorkOrderCard key={x.id} bounty={x}/>)}</div>;
}
