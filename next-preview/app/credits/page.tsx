import type {Metadata} from 'next';
import Link from 'next/link';
import {APPROVED_ARTWORK} from '@/lib/sports-identity';
export const metadata:Metadata={title:'Sports artwork credits',description:'Sources and rights for any approved club and competition artwork used in EthioLiveScores.'};
export default function Credits(){
 const items=Object.values(APPROVED_ARTWORK);
 return <main className="wrap artwork-credits"><Link href="/" className="back-link">← Back to matchday</Link>
 <span className="eyebrow">ASSET PROVENANCE</span>
 <h1>Sports artwork credits</h1>
 <p className="muted">EthioLiveScores only displays approved club crests and competition logos. Country flags are used for geographic identification. Our sports data source is <a href="https://www.thesportsdb.com/" target="_blank" rel="noopener noreferrer">TheSportsDB</a>.</p>
 {items.length?<ul>{items.map((item,i)=><li key={item.entity+item.providerId+i}><strong>{item.entity} #{item.providerId}</strong><p>{item.attribution} · {item.licence}</p><p>Creator: {item.creator}. Permission reference: {item.permissionReference}.</p></li>)}</ul>
 :<div className="surface"><h2>No third-party crest artwork approved yet</h2><p className="muted">Until specific rights are verified, club and league badges display neutral placeholders. Verified country flags are shown separately.</p></div>}
 </main>;
}
