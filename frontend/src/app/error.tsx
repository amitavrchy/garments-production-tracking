'use client';
import {ErrorBanner} from '@/components/primitives';
export default function ErrorPage({reset}:{reset:()=>void}){return <main style={{padding:40}}><h1>Something interrupted your workspace</h1><p>Your saved records are safe. Try loading this page again.</p><ErrorBanner message="The page could not be displayed." retry={reset}/></main>;}
