import Link from "next/link";
export function SiteFooter() {
  return <footer className="site-footer">
    <div><strong>LATCH</strong><span>public software repair, settled by evidence</span></div>
    <div className="footer-links"><Link href="/protocol">trust model</Link><a href="https://studio.genlayer.com" target="_blank">studionet ↗</a></div>
  </footer>;
}
