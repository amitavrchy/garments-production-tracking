import Link from 'next/link';
export default function NotFound(){return <main className="empty" style={{minHeight:'90vh'}}><div className="eyebrow">404 · WORKSPACE NOT FOUND</div><h1>This page is off the floor.</h1><p>Return to your overview to keep production moving.</p><Link className="button primary" href="/">Back to overview</Link></main>;}
