import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';
import './responsive.css';
export const metadata:Metadata={title:{default:'Loom · Production workspace',template:'%s · Loom'},description:'A connected production floor. Track apparel orders, live output, quality, shipments, and worker earnings.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>;}
