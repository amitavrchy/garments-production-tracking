'use client';
import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { api } from './api';
import { Resource, Row, Overview, today } from './types';
import { canRead } from './permissions';
import { useSession } from '@/components/providers';
import {advancedConfigs} from './advanced';
const resources: Resource[] = [
  ...Object.keys(advancedConfigs) as Resource[],
  'factories',
  'floors',
  'lines',
  'machines',
  'workers',
  'users',
  'buyers',
  'styles',
  'bom',
  'operations',
  'orders',
  'quantities',
  'milestones',
  'assignments',
  'allocations',
  'materials',
  'cutting',
  'production',
  'qc',
  'finishing',
  'shipments',
  'cartons',
  'pieceEntries',
  'payroll',
];
export function useWorkspace(date = today()) {
  const { user } = useSession();
  const [data, setData] = useState<Partial<Record<Resource, Row[]>>>({}),
    [overview, setOverview] = useState<Overview | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [connected, setConnected] = useState(false);
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const available = resources.filter((r) => canRead(user.role, r));
      const [report, ...lists] = await Promise.all([
        api<Overview>(`/reports/overview?date=${date}`),
        ...available.map((r) => api<Row[]>(`/data/${r}`)),
      ]);
      setOverview(report as Overview);
      const records=Object.fromEntries(available.map((r,i)=>[r,lists[i]]));
      if(user.role!=='FACTORY_ADMIN')records.users=await api<Row[]>('/directory');
      setData(records);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load workspace');
    } finally {
      setLoading(false);
    }
  }, [user, date]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (!user) return;
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin, {
      withCredentials: true,
    });
    let timer: ReturnType<typeof setTimeout>;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('changed', () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 250);
    });
    return () => {
      clearTimeout(timer);
      socket.disconnect();
    };
  }, [user, refresh]);
  const label = (resource: Resource, id: string) => {
    const row = data[resource]?.find((r) => r.id === id);
    return (
      row?.poNumber ||
      row?.code ||
      row?.number || row?.lotNo || row?.layNumber || row?.title ||
      row?.name ||
      row?.employeeCode ||
      row?.description ||
      row?.invoiceNo ||
      row?.cartonNo ||
      id
    );
  };
  return { data, overview, loading, error, connected, refresh, label };
}
export type Workspace = ReturnType<typeof useWorkspace>;
