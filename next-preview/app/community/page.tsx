import type {Metadata} from 'next';
import Link from 'next/link';
export const metadata:Metadata={title:'Fan zone · Migration preview'};
export default function Community(){return <main className="centered-error"><span>THE FAN ZONE</span><h1>Every match has a conversation.</h1><p>Community accounts, predictions and chat remain on the current production site while secure Next.js authorization and Supabase integration are being migrated.</p><Link href="/" className="action-primary">Back to matchday</Link></main>}
