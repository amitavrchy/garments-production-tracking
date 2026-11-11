export class ApiError extends Error {constructor(message:string,public status:number){super(message);}}
export async function api<T=any>(path:string,options:RequestInit={}):Promise<T>{
  const res=await fetch(`/api${path}`,{...options,credentials:'include',headers:{'Content-Type':'application/json',...options.headers}});
  const data=await res.json().catch(()=>({message:'The server returned an unreadable response'}));
  if(!res.ok)throw new ApiError(Array.isArray(data.message)?data.message.join(', '):data.message||'Request failed',res.status);
  return data;
}
export function downloadCsv(filename:string,rows:Record<string,unknown>[],columns:string[]){
  const cell=(v:unknown)=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s=`'${s}`;return `"${s.replace(/"/g,'""')}"`;};
  const blob=new Blob(['\uFEFF'+[columns.map(cell).join(','),...rows.map(r=>columns.map(c=>cell(r[c])).join(','))].join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
}
