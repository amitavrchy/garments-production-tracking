'use client';
import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  CalendarDays,
  GripVertical,
  ArrowRight,
  ScanLine,
  Download,
  CheckCircle2,
  AlertTriangle,
  Activity,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Row, number, money, today, title } from '@/lib/types';
import { Workspace } from '@/lib/workspace';
import { useSession } from './providers';
import { Badge, ErrorBanner, Empty, Loading, Modal } from './primitives';
import { RecordForm } from './record-form';
import { canWrite } from '@/lib/permissions';
export function useInsights(date = today()) {
  const [report, setReport] = useState<Row | null>(null),
    [error, setError] = useState('');
  const refresh = async () => {
    try {
      setReport(await api(`/advanced/insights?date=${date}`));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
  }, [date]);
  return { report, error, refresh };
}
export function AdvancedModulePanel({
  module,
  workspace,
}: {
  module: string;
  workspace: Workspace;
}) {
  if (module === 'capacity') return <CapacityWorkbench workspace={workspace} />;
  if (module === 'traceability') return <BundleExplorer workspace={workspace} />;
  if (
    ![
      'procurement',
      'warehouse',
      'equipment',
      'workforce',
      'assurance',
      'commercial',
      'governance',
    ].includes(module)
  )
    return null;
  return <OperationalSummary module={module} />;
}
function OperationalSummary({ module }: { module: string }) {
  const { report: r, error } = useInsights();
  if (error) return <ErrorBanner message={error} />;
  if (!r) return null;
  const sets: Record<string, { label: string; value: string; detail: string; bad?: boolean }[]> = {
    procurement: [
      {
        label: 'Awaiting approval',
        value: number(r.procurement.pending),
        detail: 'Independent accounts review',
      },
      {
        label: 'Overdue receipts',
        value: number(r.procurement.late),
        detail: 'Open supplier commitments',
        bad: r.procurement.late > 0,
      },
      {
        label: 'Committed value',
        value:
          r.procurement.committedMinor === null
            ? 'Restricted'
            : money(r.procurement.committedMinor),
        detail: 'Approved + received · BDT equivalent',
      },
    ],
    warehouse: [
      {
        label: 'Tracked lots',
        value: number(r.stock.lots),
        detail: 'Fabric and trims by lot / roll',
      },
      {
        label: 'Quality-held lots',
        value: number(r.stock.held),
        detail: 'Held stock cannot be issued',
        bad: r.stock.held > 0,
      },
      {
        label: 'Storage locations',
        value: number(r.stock.byWarehouse.length),
        detail: 'Warehouses with tracked stock',
      },
    ],
    equipment: [
      {
        label: 'Estimated OEE',
        value: r.oee.toFixed(1) + '%',
        detail: 'Availability × SMV performance × good yield',
      },
      {
        label: 'Open work orders',
        value: number(r.maintenance.open),
        detail: 'Machines stay in maintenance until completion',
      },
      {
        label: 'Overdue maintenance',
        value: number(r.maintenance.overdue),
        detail: 'Past the scheduled due date',
        bad: r.maintenance.overdue > 0,
      },
    ],
    workforce: [
      {
        label: 'Present today',
        value: number(r.workforce.present),
        detail: 'Recorded attendance · Dhaka',
      },
      {
        label: 'Overtime recorded',
        value: number(r.workforce.overtimeMinutes) + ' min',
        detail: 'Beyond the configured shift',
      },
      {
        label: 'Expired qualifications',
        value: number(r.workforce.expiredSkills),
        detail: 'Excluded from worker recommendations',
        bad: r.workforce.expiredSkills > 0,
      },
    ],
    assurance: [
      {
        label: 'Passed final audits',
        value: number(r.quality.passed),
        detail: 'Explicit buyer acceptance limits',
      },
      {
        label: 'Failed final audits',
        value: number(r.quality.failed),
        detail: 'Critical or acceptance-limit failure',
        bad: r.quality.failed > 0,
      },
      {
        label: 'Overdue CAPAs',
        value: number(r.quality.overdueCapa),
        detail: `${r.quality.openCapa} corrective actions remain open`,
        bad: r.quality.overdueCapa > 0,
      },
    ],
    commercial: [
      {
        label: 'Costed revisions',
        value: r.costing ? number(r.costing.sheets) : 'Restricted',
        detail: 'Calculated and approved cost sheets',
      },
      {
        label: 'Average quoted margin',
        value: r.costing ? r.costing.averageMargin.toFixed(1) + '%' : 'Restricted',
        detail: 'Selling price less reconciled unit cost',
      },
      {
        label: 'Procurement awaiting review',
        value: number(r.procurement.pending),
        detail: 'Approval is separated from creation',
      },
    ],
    governance: [
      {
        label: 'Open compliance requirements',
        value: number(r.compliance.open),
        detail: 'Items awaiting a passing review',
      },
      {
        label: 'Critical requirements',
        value: number(r.compliance.critical),
        detail: 'Require evidence and independent review',
        bad: r.compliance.critical > 0,
      },
      {
        label: 'Estimated electricity emissions',
        value: r.impact.estimatedCo2Kg.toFixed(1) + ' kg CO₂',
        detail: 'Measured kWh × supplied conversion factor',
      },
    ],
  };
  return (
    <>
      <div className="advanced-kpis">
        {sets[module].map((k) => (
          <article key={k.label}>
            <span>{k.label}</span>
            <strong className={k.bad ? 'warning-text' : ''}>{k.value}</strong>
            <p>{k.detail}</p>
          </article>
        ))}
      </div>
      {module === 'equipment' && (
        <div className="advanced-two-col">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Availability & loss</h2>
                <p>Recorded downtime is capped at shift duration for the availability estimate.</p>
              </div>
            </div>
            <div className="metric-bars">
              {r.equipment.map((line: Row) => (
                <div key={line.id}>
                  <strong>{line.code}</strong>
                  <div className="bar-rail">
                    <i style={{ width: `${line.availability}%` }} />
                  </div>
                  <span>
                    {line.availability.toFixed(1)}% · {line.downtime} min lost
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Downtime Pareto</h2>
            </div>
            <div className="metric-bars">
              {r.reasons.length ? (
                r.reasons.map((loss: Row) => (
                  <div key={loss.reason}>
                    <strong>{title(loss.reason)}</strong>
                    <div className="bar-rail">
                      <i
                        style={{
                          width: `${(loss.minutes / Math.max(...r.reasons.map((r: Row) => r.minutes))) * 100}%`,
                          background: '#d19d46',
                        }}
                      />
                    </div>
                    <span>{loss.minutes} min</span>
                  </div>
                ))
              ) : (
                <Empty title="No losses recorded" description="Log downtime to build the Pareto." />
              )}
            </div>
          </section>
        </div>
      )}
      {module === 'governance' && (
        <div className="impact-strip">
          <span>
            <strong>{number(r.impact.energyKwh)}</strong> kWh recorded
          </span>
          <span>
            <strong>{number(r.impact.waterLiters)}</strong> liters recorded
          </span>
          <span>
            <strong>{number(r.impact.scrapKg)}</strong> kg scrap
          </span>
          <span>
            <strong>{number(r.impact.recycledKg)}</strong> kg recovered
          </span>
        </div>
      )}
    </>
  );
}
export function CapacityWorkbench({ workspace }: { workspace: Workspace }) {
  const { user } = useSession(),
    [start, setStart] = useState(today()),
    [line, setLine] = useState(workspace.data.lines?.[0]?.id || ''),
    [date, setDate] = useState(today()),
    [balance, setBalance] = useState<Row | null>(null),
    [error, setError] = useState(''),
    [drag, setDrag] = useState<Row | null>(null),
    [newAllocation, setNewAllocation] = useState(false),
    [view, setView] = useState<'board' | 'balance'>('board');
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  useEffect(() => {
    if (view !== 'balance' || !line) return;
    let active = true;
    api<Row>(`/advanced/balance/${line}?date=${date}`)
      .then((r) => {
        if (active) {
          setBalance(r);
          setError('');
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [line, date, view, workspace.data.stations]);
  async function drop(lineId: string, targetDate: string) {
    if (!drag) return;
    setError('');
    try {
      await api(`/data/allocations/${drag.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          lineId,
          orderId: drag.orderId,
          date: targetDate,
          target: drag.target,
          expectedVersion: drag.version,
        }),
      });
      await workspace.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDrag(null);
    }
  }
  const simulated = (workspace.data.scenarios || []).filter((s) => s.result);
  return (
    <section className="capacity-workbench">
      <div className="workbench-toolbar">
        <div className="segmented">
          <button className={view === 'board' ? 'selected' : ''} onClick={() => setView('board')}>
            Capacity board
          </button>
          <button
            className={view === 'balance' ? 'selected' : ''}
            onClick={() => setView('balance')}
          >
            Operation balance
          </button>
        </div>
        {view === 'board' ? (
          <>
            <label className="date-control">
              <CalendarDays size={17} />
              <input
                type="date"
                aria-label="Capacity board start"
                value={start}
                onChange={(e) => e.target.value && setStart(e.target.value)}
              />
            </label>
            {canWrite(user?.role || '', 'allocations') && (
              <button className="button" onClick={() => setNewAllocation(true)}>
                Allocate an order
              </button>
            )}
          </>
        ) : (
          <>
            <select
              aria-label="Balance line"
              value={line}
              onChange={(e) => setLine(e.target.value)}
            >
              {workspace.data.lines?.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.code}
                </option>
              ))}
            </select>
            <input
              aria-label="Balance date"
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </>
        )}
      </div>
      {error && <ErrorBanner message={error} />}{' '}
      {view === 'board' ? (
        <>
          <div className="schedule-scroll">
            <div className="schedule-grid">
              <div className="schedule-cell schedule-corner">Production line</div>
              {days.map((day) => (
                <div className="schedule-cell schedule-date" key={day}>
                  <strong>
                    {new Date(day + 'T00:00:00Z').toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'UTC',
                    })}
                  </strong>
                  <span>
                    {new Date(day + 'T00:00:00Z').toLocaleDateString('en-GB', {
                      weekday: 'short',
                      timeZone: 'UTC',
                    })}
                  </span>
                </div>
              ))}
              {workspace.data.lines?.map((l) => (
                <div className="schedule-row" key={l.id}>
                  <div className="schedule-cell schedule-line">
                    <strong>{l.code}</strong>
                    <span>{l.targetManpower} operators</span>
                  </div>
                  {days.map((day) => {
                    const a = workspace.data.allocations?.find(
                        (a) => a.lineId === l.id && a.date === day,
                      ),
                      locked = workspace.data.production?.some(
                        (p) => p.lineId === l.id && p.date === day,
                      );
                    return (
                      <div
                        className={`schedule-cell drop-cell ${drag && !a ? 'drop-ready' : ''}`}
                        key={day}
                        onDragOver={(e) => {
                          if (!a) e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!a) void drop(l.id, day);
                        }}
                      >
                        {a ? (
                          <div
                            className={`allocation-ticket ${locked ? 'locked' : ''}`}
                            draggable={!locked && canWrite(user?.role || '', 'allocations')}
                            onDragStart={() => setDrag(a)}
                            onDragEnd={() => setDrag(null)}
                          >
                            <div>
                              <GripVertical size={15} />
                              <strong>{workspace.label('orders', a.orderId)}</strong>
                            </div>
                            <span>{number(a.target)} pcs planned</span>
                            <small>
                              {locked ? 'Actuals recorded · locked' : 'Drag to a free slot'}
                            </small>
                          </div>
                        ) : (
                          <span className="free-slot">Available</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <p className="workbench-note">
            Drag an unstarted allocation into an empty line/day slot. Existing targets and recorded
            actuals are preserved.
          </p>
          {simulated.length > 0 && (
            <div className="scenario-comparison">
              {simulated.slice(-3).map((s) => (
                <div key={s.id}>
                  <span>{s.name}</span>
                  <strong>{number(s.result.plannedPcs)} pcs</strong>
                  <p>
                    {s.result.utilization.toFixed(1)}% planned utilization ·{' '}
                    {number(s.result.latePcs)} pcs late
                  </p>
                  <Badge value={s.status} />
                </div>
              ))}
            </div>
          )}
        </>
      ) : !balance ? (
        <Loading />
      ) : !balance.allocation ? (
        <Empty
          title="No allocation for this line/day"
          description="Allocate an order first to calculate the operation balance."
        />
      ) : (
        <>
          <div className="balance-summary">
            <span>
              Order <strong>{balance.order.poNumber}</strong>
            </span>
            <span>
              Target <strong>{number(balance.allocation.target)} pcs</strong>
            </span>
            <span>
              Bottleneck capacity <strong>{number(balance.bottleneck)} pcs</strong>
            </span>
            <span>Assumption: 80% efficiency</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>SMV</th>
                  <th>Allocated / needed</th>
                  <th>Capacity</th>
                  <th>Gap to target</th>
                  <th>Qualified workers</th>
                </tr>
              </thead>
              <tbody>
                {balance.operations.map((op: Row) => (
                  <tr key={op.id}>
                    <td>
                      {op.seq}. {op.name}
                    </td>
                    <td>{op.smv}</td>
                    <td>
                      {op.operators} / {op.recommended}
                    </td>
                    <td>{number(op.capacity)}</td>
                    <td className={op.gap ? 'warning-text' : ''}>{number(op.gap)}</td>
                    <td>
                      {balance.recommendations
                        .find((r: Row) => r.operationId === op.id)
                        ?.workers.slice(0, 2)
                        .map((w: Row) => `${w.name} (${w.efficiency}%)`)
                        .join(', ') || 'No current qualified worker'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {newAllocation && (
        <RecordForm
          resource="allocations"
          workspace={workspace}
          onClose={() => setNewAllocation(false)}
          onSaved={async () => {
            setNewAllocation(false);
            await workspace.refresh();
          }}
        />
      )}
    </section>
  );
}
export function BundleExplorer({ workspace }: { workspace: Workspace }) {
  const [code, setCode] = useState(''),
    [trace, setTrace] = useState<Row | null>(null),
    [error, setError] = useState(''),
    [qr, setQr] = useState(''),
    [busy, setBusy] = useState(false);
  async function lookup(value: string) {
    setBusy(true);
    setError('');
    try {
      const r = await api<Row>(`/advanced/trace/${encodeURIComponent(value.trim())}`);
      setTrace(r);
      setQr(
        await QRCode.toDataURL(
          `${window.location.origin}/traceability?code=${encodeURIComponent(r.bundle.code)}`,
          { width: 220, margin: 1, color: { dark: '#213b2e', light: '#ffffff' } },
        ),
      );
    } catch (e) {
      setError((e as Error).message);
      setTrace(null);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('code');
    if (initial) {
      setCode(initial);
      void lookup(initial);
    }
  }, []);
  return (
    <section className="panel bundle-explorer">
      <div className="panel-head">
        <div>
          <h2>
            <ScanLine size={21} />
            Scan the digital thread
          </h2>
          <p>Use a barcode scanner, enter a ticket code, or open its QR link.</p>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(code);
        }}
        className="bundle-search"
      >
        <input
          aria-label="Bundle lookup code"
          placeholder="e.g. BDL-2026-0001"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <button className="button primary" disabled={busy}>
          {busy ? 'Looking up…' : 'Trace bundle'}
          <ArrowRight size={17} />
        </button>
      </form>
      {error && <ErrorBanner message={error} />}{' '}
      {trace && (
        <div className="trace-content">
          <div className="bundle-passport">
            <div>
              <span className="eyebrow">BUNDLE PASSPORT</span>
              <h3>{trace.bundle.code}</h3>
              <p>
                {trace.order.poNumber} · {trace.style.code}
              </p>
              <p>
                {trace.cut.color} / {trace.cut.size} · {trace.bundle.qty} pieces
              </p>
              <Badge value={trace.bundle.status} />
            </div>
            <div className="bundle-qr">
              {qr && (
                <img src={qr} alt={`QR ticket for ${trace.bundle.code}`} width={144} height={144} />
              )}
              <a href={qr} download={`${trace.bundle.code}.png`} className="text-link">
                <Download size={16} />
                Download QR
              </a>
            </div>
          </div>
          <ol className="trace-timeline">
            {trace.events.map((event: Row) => (
              <li key={event.id}>
                <span className="timeline-dot">
                  <CheckCircle2 size={17} />
                </span>
                <div>
                  <strong>{title(event.stage)}</strong>
                  <p>
                    {workspace.label('users', event.actorId)} ·{' '}
                    {new Date(event.at).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
export function AdvancedRecordDetails({ resource, record }: { resource: string; record: Row }) {
  if (resource === 'scenarios' && record.result)
    return (
      <div className="scenario-result">
        <div className="advanced-kpis">
          <article>
            <span>Planned pieces</span>
            <strong>{number(record.result.plannedPcs)}</strong>
          </article>
          <article>
            <span>Utilization</span>
            <strong>{record.result.utilization.toFixed(1)}%</strong>
          </article>
          <article>
            <span>Late planned pieces</span>
            <strong>{number(record.result.latePcs)}</strong>
          </article>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Line</th>
                <th>Order</th>
                <th>Target / capacity</th>
                <th>Delivery</th>
              </tr>
            </thead>
            <tbody>
              {record.result.plan.map((p: Row, i: number) => (
                <tr key={i}>
                  <td>{p.date}</td>
                  <td>{p.line}</td>
                  <td>{p.poNumber}</td>
                  <td>
                    {number(p.target)} / {number(p.capacity)}
                  </td>
                  <td>
                    {p.late ? <span className="warning-text">After delivery</span> : 'On time'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {record.result.unplanned.length > 0 && (
          <div className="info-note">
            <AlertTriangle size={18} />
            <span>
              Unplanned:{' '}
              {record.result.unplanned
                .map((o: Row) => `${o.poNumber} · ${number(o.qty)} pcs`)
                .join('; ')}
              . Increase the horizon, manpower or overtime, then simulate again.
            </span>
          </div>
        )}
      </div>
    );
  if (resource === 'costing' && record.breakdown)
    return (
      <div className="cost-breakdown">
        <div className="margin-callout">
          <span>
            Reconciled unit cost <strong>{money(record.totalMinor)}</strong>
          </span>
          <span>
            Quoted gross margin <strong>{record.marginPercent.toFixed(2)}%</strong>
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>BOM material</th>
                <th>Consumption</th>
                <th>Wastage</th>
                <th>BDT unit price</th>
                <th>Cost / garment</th>
              </tr>
            </thead>
            <tbody>
              {record.breakdown.map((b: Row, i: number) => (
                <tr key={i}>
                  <td>{b.description}</td>
                  <td>
                    {b.consumption} {b.uom}
                  </td>
                  <td>{b.wastageBps / 100}%</td>
                  <td>{money(b.unitCostMinor)}</td>
                  <td>{money(b.costMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  return null;
}
