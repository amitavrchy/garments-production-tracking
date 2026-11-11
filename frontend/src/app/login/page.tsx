'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Login} from '@/components/login';
import {Loading} from '@/components/primitives';
import {useSession} from '@/components/providers';
export default function Page(){const {user,loading}=useSession(),router=useRouter();useEffect(()=>{if(user)router.replace('/workspace');},[user,router]);return loading||user?<Loading/>:<Login/>;}
