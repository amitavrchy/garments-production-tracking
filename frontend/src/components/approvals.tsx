'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { useSession } from './providers';
import { canWrite } from '@/lib/permissions';
import { Resource, Row, money, title } from '@/lib/types';
import { api } from '@/lib/api';
import { Loading, ErrorBanner, Empty, Badge } from './primitives';
const definitions: {
  resource: Resource;
  status: string;
  target: string;
  label: string;
  path: string;
  owner: string;
}[] = [
  {
    resource: 'purchases',
    status: 'SUBMITTED',
    target: 'APPROVED',
    label: 'Procurement',
    path: '/procurement',
    owner: 'createdBy',
  },
  {
    resource: 'payroll',
    status: 'CALCULATED',
    target: 'APPROVED',
    label: 'Payroll',
    path: '/payroll',
    owner: 'calculatedBy',
  },
  {
    resource: 'costing',
    status: 'CALCULATED',
    target: 'APPROVED',
    label: 'Cost sheet',
    path: '/commercial',
    owner: 'createdBy',
  },
  {
    resource: 'correctiveActions',
    status: 'IN_PROGRESS',
    target: 'VERIFIED',
    label: 'CAPA verification',
    path: '/assurance',
    owner: 'ownerId',
  },
  {
    resource: 'compliance',
    status: 'REVIEW',
    target: 'PASSED',
    label: 'Compliance',
    path: '/governance',
    owner: 'ownerId',
  },
];
export function Approvals() {
  const workspace = useWorkspace(),
    { user } = useSession(),
    [filter, setFilter] = useState('all'),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  if (workspace.loading) return <Loading />;
  const items = definitions.flatMap((d) =>
    (workspace.data[d.resource] || [])
      .filter((row) => row.status === d.status)
      .map((row) => ({
        definition: d,
        row,
        eligible:
          canWrite(user?.role || '', d.resource) &&
          row[d.owner] !== user?.id &&
          (!['purchases', 'costing'].includes(d.resource) ||
            ['FACTORY_ADMIN', 'ACCOUNTS'].includes(user?.role || '')),
      })),
  );
  const shown = items.filter(
    (item) =>
      filter === 'all' ||
      (filter === 'mine' && item.eligible) ||
      filter === item.definition.resource,
  );
  async function approve(resource: Resource, row: Row, status: string) {
    setBusy(row.id);
    setError('');
    setSuccess('');
    try {
      await api(`/data/${resource}/${row.id}/actions`, {
        method: 'POST',
        body: JSON.stringify({ status, expectedVersion: row.version }),
      });
      setSuccess('Review recorded. The decision is retained in the audit history.');
      await workspace.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <div className="eyebrow">DECISIONS WITH ACCOUNTABILITY</div>
          <h1>
            Approval desk<span className="heading-dot">.</span>
          </h1>
          <p>Commercial, payroll and quality decisions in one review queue.</p>
        </div>
        <button className="button" onClick={workspace.refresh}>
          <RefreshCw size={17} />
          Refresh queue
        </button>
      </div>
      <div className="advanced-kpis">
        <article>
          <span>Awaiting a decision</span>
          <strong>{items.length}</strong>
          <p>Submitted across your accessible modules</p>
        </article>
        <article>
          <span>Eligible for your review</span>
          <strong>{items.filter((i) => i.eligible).length}</strong>
          <p>Role and independent-review rules applied</p>
        </article>
        <article>
          <span>Review controls</span>
          <strong>Independent</strong>
          <p>Creators and accountable owners cannot approve their own work</p>
        </article>
      </div>
      {(error || workspace.error) && <ErrorBanner message={error || workspace.error} />}{' '}
      {success && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {success}
        </div>
      )}
      <div className="tabs" role="tablist" aria-label="Approval queue filter">
        {[
          ['all', 'All pending'],
          ['mine', 'For my review'],
          ...definitions.map((d) => [d.resource, d.label]),
        ].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="approval-grid">
        {shown.map(({ definition: d, row, eligible }) => (
          <article className="panel approval-card" key={d.resource + row.id}>
            <div className="approval-card-top">
              <span className="approval-icon">
                <ShieldCheck size={22} />
              </span>
              <span>{d.label}</span>
              <Badge value={row.status} />
            </div>
            <h2>{row.number || row.name || row.title}</h2>
            <p>
              {row.orderId
                ? workspace.label('orders', row.orderId)
                : row.periodStart
                  ? `${row.periodStart} → ${row.periodEnd}`
                  : 'Review evidence and corrective actions before deciding.'}
            </p>
            <div className="approval-owner">
              <span>Prepared / owned by</span>
              <strong>{workspace.label('users', row[d.owner])}</strong>
            </div>
            {row.totalMinor !== undefined && (
              <strong className="approval-value">{money(row.totalMinor)}</strong>
            )}
            {d.resource === 'purchases' && (
              <strong className="approval-value">
                {money(Math.round(row.qty * row.unitCostMinor * row.exchangeRate))}
                <small> BDT equivalent</small>
              </strong>
            )}
            <div className="detail-actions">
              <Link
                className="button"
                href={`${d.path}?q=${encodeURIComponent(row.number || row.name || row.title)}`}
              >
                Review details
                <ArrowUpRight size={16} />
              </Link>
              <button
                className="button primary"
                disabled={!eligible || !!busy}
                onClick={() => approve(d.resource, row, d.target)}
              >
                {busy === row.id ? 'Recording…' : `Mark ${title(d.target)}`}
              </button>
            </div>
            {!eligible && (
              <p className="approval-reason">This record requires a different eligible reviewer.</p>
            )}
          </article>
        ))}
      </div>
      {!shown.length && (
        <section className="panel">
          <Empty
            title="Review queue is clear"
            description="Eligible submissions appear here when they reach the review stage."
          />
        </section>
      )}
    </div>
  );
}
