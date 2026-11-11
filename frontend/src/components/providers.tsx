'use client';
import { createContext,useContext,useState,useEffect,useCallback,ReactNode } from 'react';
import { api,ApiError } from '@/lib/api';
import { User } from '@/lib/types';
type Session={user:User|null;loading:boolean;error:string;refresh:()=>Promise<void>;logout:()=>Promise<void>};
const Context=createContext<Session>(null!);
export function Providers({children}:{children:ReactNode}){
  const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const refresh=useCallback(async()=>{try{setUser(await api<User>('/auth/me'));setError('');}catch(e){setUser(null);if(!(e instanceof ApiError&&e.status===401))setError('Cannot reach the API. Check that the backend is running.');}finally{setLoading(false);}},[]);
  useEffect(()=>{void refresh();},[refresh]);
  const logout=async()=>{await api('/auth/logout',{method:'POST',body:'{}'});setUser(null);};
  return <Context.Provider value={{user,loading,error,refresh,logout}}>{children}</Context.Provider>;
}
export const useSession=()=>useContext(Context);
