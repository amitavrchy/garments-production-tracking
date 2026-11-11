'use client';
import { useEffect, useState } from 'react';
import { Download, CalendarDays, ArrowUpRight } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { Row, today, number } from '@/lib/types';
import { api, downloadCsv } from '@/lib/api';
import { useSession } from './providers';
import { Loading, ErrorBanner, Empty, Modal } from './primitives';
import { OutputChart } from './charts';
export function Reports() {
  const [date, setDate] = useState(today()),
    { overview: r, loading, error, refresh, label } = useWorkspace(date),
    { user } = useSession(),
    [tab, setTab] = useState('WIP'),
    [audit, setAudit] = useState<Row[]>([]),
    [auditError, setAuditError] = useState(''),
    [auditBusy, setAuditBusy] = useState(false),
    [selected, setSelected] = useState<Row | null>(null);
  const canAudit = ['FACTORY_ADMIN', 'ACCOUNTS'].includes(user?.role || '');
  useEffect(() => {
    if (tab !== 'Audit') return;
    setAuditBusy(true);
    api<Row[]>('/reports/audit')
      .then(setAudit)
      .catch((e) => setAuditError(e.message))
      .finally(() => setAuditBusy(false));
  }, [tab]);
  if (loading) return <Loading />;
  if (!r) return <ErrorBanner message={error || 'Could not load reports'} retry={refresh} />;
  const columns =
    tab === 'WIP'
      ? [
          'orderId',
          'color',
          'size',
          'ordered',
          'cut',
          'input',
          'sewn',
          'rejected',
          'rework',
          'finished',
          'packed',
          'shipped',
        ]
      : tab === 'Efficiency'
        ? ['code', 'actual', 'target', 'efficiency', 'operators']
        : tab === 'Quality'
          ? ['code', 'actual', 'dhu']
          : ['at', 'actorId', 'action', 'resource', 'recordId'];
  const rows = tab === 'WIP' ? r.wip : tab === 'Efficiency' || tab === 'Quality' ? r.lines : audit;
  const value = (row: Row, key: string) =>
    key === 'orderId'
      ? label('orders', row[key])
      : key === 'actorId'
        ? label('users', row[key])
        : key === 'at'
          ? new Date(row[key]).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })
          : typeof row[key] === 'number'
            ? number(Number(row[key].toFixed(2)))
            : row[key] || '—';
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <div className="eyebrow">MEASURE WHAT MATTERS</div>
          <h1>
            Reports & insights<span className="heading-dot">.</span>
          </h1>
          <p>A clear record of production, quality, and every change.</p>
        </div>
        <div className="heading-actions">
          <label className="date-control">
            <CalendarDays size={17} />
            <input
              type="date"
              aria-label="Report date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </label>
          <button
            className="button"
            onClick={() =>
              downloadCsv(
                `loom-${tab.toLowerCase()}-${date}.csv`,
                rows.map((row) => Object.fromEntries(columns.map((k) => [k, value(row, k)]))),
                columns,
              )
            }
          >
            <Download size={17} />
            Export report
          </button>
        </div>
      </div>
      {error && <ErrorBanner message={error} retry={refresh} />}
      <div className="report-summary">
        <div>
          <span>Produced on selected day</span>
          <strong>{number(r.actual)} pcs</strong>
        </div>
        <div>
          <span>Weighted floor efficiency</span>
          <strong>{r.efficiency.toFixed(2)}%</strong>
        </div>
        <div>
          <span>Defects per hundred units</span>
          <strong>{r.dhu.toFixed(2)}%</strong>
        </div>
        <div>
          <span>Open rework · all time</span>
          <strong>{number(r.wip.reduce((n, b) => n + b.rework, 0))} pcs</strong>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Report type">
        {['WIP', 'Efficiency', 'Quality', ...(canAudit ? ['Audit'] : [])].map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === 'WIP' ? 'Order WIP' : t === 'Audit' ? 'Audit history' : t}
          </button>
        ))}
      </div>
      {tab === 'Efficiency' && (
        <section className="panel" style={{ marginBottom: 22 }}>
          <div className="panel-head">
            <div>
              <h2>Hourly output</h2>
              <p>Weighted efficiency uses actual operator-minutes, including overtime.</p>
            </div>
          </div>
          <OutputChart data={r.hourly} />
        </section>
      )}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>
              {tab === 'WIP'
                ? 'Color & size balance'
                : tab === 'Audit'
                  ? 'Mutation history'
                  : `${tab} by line`}
            </h2>
            <p>
              {tab === 'WIP'
                ? 'Cumulative balances across all production dates.'
                : tab === 'Audit'
                  ? 'Latest 300 changes. Before and after values are retained.'
                  : 'Production-day metrics for the selected Dhaka date.'}
            </p>
          </div>
        </div>
        {auditError && tab === 'Audit' && <ErrorBanner message={auditError} />}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((k) => (
                  <th key={k}>
                    {(
                      {
                        orderId: 'Purchase order',
                        input: 'Sew input',
                        sewn: 'Sew output',
                        rework: 'Open rework',
                        code: 'Line',
                        actual: 'Output',
                        dhu: 'DHU %',
                        efficiency: 'Efficiency %',
                        at: 'Time · Dhaka',
                        actorId: 'User',
                        recordId: 'Record',
                      } as Record<string, string>
                    )[k] || k.charAt(0).toUpperCase() + k.slice(1)}
                  </th>
                ))}
                {tab === 'Audit' && <th>Changes</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id || i} className={tab === 'Audit' ? 'audit-row' : ''}>
                  {columns.map((k) => (
                    <td key={k}>{value(row, k)}</td>
                  ))}
                  {tab === 'Audit' && (
                    <td>
                      <button
                        className="icon-button"
                        aria-label="View audit changes"
                        onClick={() => setSelected(row)}
                      >
                        <ArrowUpRight size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {auditBusy && tab === 'Audit' && <Loading />}
        {!rows.length && (
          <Empty
            title="No report records"
            description="Records appear as your team enters production."
          />
        )}
      </section>
      {selected && (
        <Modal
          title="Audit record"
          subtitle={`${selected.action} · ${selected.resource}`}
          onClose={() => setSelected(null)}
          wide
        >
          <div className="record-details">
            <h3>Before</h3>
            <pre className="audit-json">{JSON.stringify(selected.before, null, 2)}</pre>
            <h3>After</h3>
            <pre className="audit-json">{JSON.stringify(selected.after, null, 2)}</pre>
          </div>
        </Modal>
      )}
    </div>
  );
}
