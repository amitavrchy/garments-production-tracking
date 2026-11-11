import {requireThat} from './context';
export function splitByRatio(quantities:{color:string;size:string;qty:number}[],input:number,output:number){
  requireThat(quantities.length>0,'No quantities exist for this color');
  const total=quantities.reduce((n,q)=>n+q.qty,0);
  const split=(pcs:number)=>{
    const parts=quantities.map(q=>({qty:Math.floor(pcs*q.qty/total),fraction:pcs*q.qty/total%1}));
    let remaining=pcs-parts.reduce((n,p)=>n+p.qty,0);
    for(const {index} of parts.map((p,index)=>({...p,index})).sort((a,b)=>b.fraction-a.fraction))if(remaining-->0)parts[index].qty++;
    return parts.map(p=>p.qty);
  };
  const inputs=split(input),outputs=split(output);
  return quantities.map((q,i)=>({color:q.color,size:q.size,inputPcs:inputs[i],producedPcs:outputs[i]}));
}
