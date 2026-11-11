'use client';
import {useState,useEffect} from 'react';
import {PackageCheck,AlertTriangle} from 'lucide-react';
import {Workspace} from '@/lib/workspace';
import {Row,number} from '@/lib/types';
import {api} from '@/lib/api';
import {ErrorBanner} from './primitives';
export function MaterialRequirements({workspace}:{workspace:Workspace}){
  const [order,setOrder]=useState(workspace.data.orders?.[0]?.id||''),[rows,setRows]=useState<Row[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{if(!order)return;let active=true;setBusy(true);api<Row[]>(`/reports/materials/${order}`).then(r=>{if(active){setRows(r);setError('');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[order,workspace.data.materials]);
  return <section className="panel materials-panel"><div className="panel-head"><div><h2>BOM readiness</h2><p>Full order consumption + wastage, compared with issued stock.</p></div><select aria-label="Material requirement order" value={order} onChange={e=>setOrder(e.target.value)}>{workspace.data.orders?.map(o=><option key={o.id} value={o.id}>{o.poNumber}</option>)}</select></div>{error&&<ErrorBanner message={error}/>}<div className="readiness-grid">{busy?<p>Checking materials…</p>:rows.length?rows.map(r=><div className="readiness-item" key={r.id}>{r.shortage>0?<AlertTriangle size={21} className="warning-text"/>:<PackageCheck size={21} className="positive"/>}<div><strong>{r.description}</strong><p>Required {number(Number(r.required.toFixed(2)))} {r.uom} · Issued {number(Number(r.issued.toFixed(2)))} {r.uom}</p><span className={r.shortage>0?'warning-text':'positive'}>{r.shortage>0?`${r.shortage.toFixed(2)} ${r.uom} shortage`:'Ready for cutting'}</span></div></div>):<p>No BOM requirements for this order.</p>}</div></section>;
}
