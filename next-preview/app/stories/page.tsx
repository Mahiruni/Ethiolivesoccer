import type {Metadata} from 'next';
import Link from 'next/link';
export const metadata:Metadata={title:'Football stories · Migration preview'};
export default function Stories(){return <main className="centered-error"><span>THE GLOBAL NEWSROOM</span><h1>Stories are coming into focus.</h1><p>The existing sourced-news platform remains available in production. We're migrating its source attribution and editorial workflows securely before enabling them here.</p><Link href="/" className="action-primary">Back to matchday</Link></main>}
