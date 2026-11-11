'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Download,
  ChevronRight,
  Shirt,
  Target,
  Gauge,
  ShieldCheck,
  Clock3,
  Activity,
  AlertTriangle,
  RefreshCw,
  Layers3,
} from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { today, number, title } from '@/lib/types';
import { downloadCsv } from '@/lib/api';
import { Loading, ErrorBanner, Badge } from './primitives';
import { OutputChart } from './charts';
import { useSession } from './providers';
export function Dashboard() {
  const [date, setDate] = useState(today()),
    workspace = useWorkspace(date),
    { overview: r, data, loading, error, refresh, connected, label } = workspace;
  const { user } = useSession();
  if (loading) return <Loading />;
  if (!r)
    return <ErrorBanner message={error || 'Could not load production data'} retry={refresh} />;
  const goal = r.target ? (r.actual / r.target) * 100 : 0;
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR FLOOR, AT A GLANCE</div>
          <h1>
            Production overview<span className="heading-dot">.</span>
          </h1>
          <p>
            Good{' '}
            {new Date().toLocaleTimeString('en', {
              timeZone: 'Asia/Dhaka',
              hour12: false,
              hour: '2-digit',
            }) < '12'
              ? 'morning'
              : 'afternoon'}
            , {user?.name.split(' ')[0]}. Here’s how your floor is moving today.
          </p>
        </div>
        <div className="heading-actions">
          <label className="date-control">
            <Clock3 size={17} />
            <input
              aria-label="Dashboard date"
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </label>
          <Link className="button primary" href="/production?new=1">
            <Plus size={18} />
            Log production
          </Link>
        </div>
      </div>
      {error && <ErrorBanner message={error} retry={refresh} />}
      <div className="overview-strip">
        <div>
          <span className={`status-dot ${connected ? '' : 'muted'}`} />
          <strong>{connected ? 'Live floor updates' : 'Auto-refresh every 30 seconds'}</strong>
          <span className="strip-separator">/</span>
          <span>{data.factories?.[0]?.name || 'Factory workspace'}</span>
        </div>
        <span>
          {r.lines.length} production lines <span className="strip-separator">·</span>{' '}
          {r.activeOrders} open orders
        </span>
      </div>
      <div className="metrics-grid">
        <Metric
          label="Today’s output"
          value={number(r.actual)}
          unit="pcs"
          Icon={Shirt}
          detail={
            <>
              <span className="positive">{goal.toFixed(1)}% of target</span>
              <span> / {number(r.target)} pcs</span>
            </>
          }
        />
        <Metric
          label="Floor efficiency"
          value={r.efficiency.toFixed(1)}
          unit="%"
          Icon={Gauge}
          detail={<>Earned minutes / available minutes</>}
        />
        <Metric
          label="Quality · DHU"
          value={r.dhu.toFixed(2)}
          unit="%"
          Icon={ShieldCheck}
          detail={
            <>
              <span className={r.dhu <= 3 ? 'positive' : 'warning-text'}>{r.defects} defects</span>
              <span> / {number(r.inspected)} inspected</span>
            </>
          }
        />
        <Metric
          label="Active orders"
          value={number(r.activeOrders)}
          unit="orders"
          Icon={Layers3}
          detail={
            <>
              <span className={r.alerts.length ? 'warning-text' : 'positive'}>
                {r.orders.filter((o) => o.atRisk).length} need attention
              </span>
              <span> across the factory</span>
            </>
          }
        />
      </div>
      <div className="dashboard-charts">
        <section className="panel output-panel">
          <div className="panel-head">
            <div>
              <h2>Hourly production</h2>
              <p>Actual output against your planned pace</p>
            </div>
            <div className="chart-legend">
              <span>
                <i className="actual" />
                Actual
              </span>
              <span>
                <i />
                Target
              </span>
            </div>
          </div>
          <div className="chart-total">
            <strong>{number(r.actual)}</strong>
            <span>pieces produced</span>
            <span className="subtle-chip">{date === today() ? 'Today' : date} · Dhaka</span>
          </div>
          <OutputChart data={r.hourly} />
        </section>
        <section className="panel shift-panel">
          <div className="panel-head">
            <div>
              <h2>Shift progress</h2>
              <p>Every piece brings you closer</p>
            </div>
            <Target size={20} className="muted-text" />
          </div>
          <div className="progress-orbit">
            <svg
              viewBox="0 0 200 125"
              role="img"
              aria-label={`Shift target achieved ${goal.toFixed(1)} percent`}
            >
              <path
                d="M25 103 A75 75 0 0 1 175 103"
                fill="none"
                stroke="#f0eeea"
                strokeWidth="17"
                strokeLinecap="round"
              />
              <path
                d="M25 103 A75 75 0 0 1 175 103"
                fill="none"
                stroke="#dd6648"
                strokeWidth="17"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray={`${Math.min(goal, 100)} 100`}
              />
            </svg>
            <div>
              <strong>
                {goal.toFixed(1)}
                <span>%</span>
              </strong>
              <span>of shift target</span>
            </div>
          </div>
          <div className="shift-stat">
            <span>Target output</span>
            <strong>
              {number(r.target)} <small>pcs</small>
            </strong>
          </div>
          <div className="shift-stat">
            <span>Remaining</span>
            <strong>
              {number(Math.max(0, r.target - r.actual))} <small>pcs</small>
            </strong>
          </div>
          <Link href="/planning" className="text-link">
            View production plan <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <section className="panel line-panel">
        <div className="panel-head">
          <div>
            <h2>
              On the production floor <span className="count-badge">{r.lines.length} lines</span>
            </h2>
            <p>A live pulse of every sewing line</p>
          </div>
          <Link href="/production" className="text-link">
            View all entries <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="line-grid">
          {r.lines.map((line, i) => (
            <Link href={`/production?line=${line.id}`} className="line-card" key={line.id}>
              <div className="line-card-top">
                <span className="line-icon">
                  <Activity size={20} />
                </span>
                <strong>{line.code}</strong>
                <span className={`line-status ${line.actual ? 'running' : ''}`}>
                  <i />
                  {line.actual ? 'Running' : 'Idle'}
                </span>
              </div>
              <p>{line.orderId ? label('orders', line.orderId) : 'No order allocated'}</p>
              <div className="line-output">
                <strong>{number(line.actual)}</strong>
                <span>/ {number(line.target)} pcs</span>
                <ArrowUpRight size={18} />
              </div>
              <div className="progress-track">
                <i
                  style={{
                    width: `${Math.min(100, line.target ? (line.actual / line.target) * 100 : 0)}%`,
                    background: i === 2 ? '#c8a15a' : undefined,
                  }}
                />
              </div>
              <div className="line-card-bottom">
                <span>
                  Efficiency <strong>{line.efficiency.toFixed(1)}%</strong>
                </span>
                <span>{line.operators} operators</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <div className="dashboard-bottom">
        <section className="panel orders-panel">
          <div className="panel-head">
            <div>
              <h2>Orders in motion</h2>
              <p>Your upcoming delivery commitments</p>
            </div>
            <Link href="/orders" className="text-link">
              All orders <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Purchase order</th>
                  <th>Buyer / style</th>
                  <th>Delivery</th>
                  <th>Packed progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {r.orders.slice(0, 5).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link
                        className="record-link"
                        href={`/orders?q=${encodeURIComponent(o.poNumber)}`}
                      >
                        {o.poNumber}
                      </Link>
                      <span className="cell-secondary">{number(o.ordered)} pieces</span>
                    </td>
                    <td>
                      <strong>{label('buyers', o.buyerId)}</strong>
                      <span className="cell-secondary">{label('styles', o.styleId)}</span>
                    </td>
                    <td>
                      {new Date(`${o.deliveryDate}T00:00:00`).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                      <span className={`cell-secondary ${o.atRisk ? 'warning-text' : ''}`}>
                        {o.days < 0 ? 'Overdue' : `${o.days} days left`}
                      </span>
                    </td>
                    <td>
                      <div className="inline-progress">
                        <div className="progress-track">
                          <i
                            style={{
                              width: `${o.ordered ? Math.min(100, (o.packed / o.ordered) * 100) : 0}%`,
                            }}
                          />
                        </div>
                        <span>{o.ordered ? ((o.packed / o.ordered) * 100).toFixed(0) : 0}%</span>
                      </div>
                    </td>
                    <td>
                      <Badge value={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel attention-panel">
          <div className="panel-head">
            <div>
              <h2>Needs attention</h2>
              <p>Stay one step ahead</p>
            </div>
            <span className="attention-count">{r.alerts.length}</span>
          </div>
          {r.alerts.length ? (
            r.alerts.slice(0, 3).map((a, i) => (
              <Link key={i} href="/orders" className="attention-item">
                <span>
                  <AlertTriangle size={19} />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <p>{a.detail}</p>
                </div>
                <ChevronRight size={17} />
              </Link>
            ))
          ) : (
            <div className="all-clear">
              <ShieldCheck size={28} />
              <strong>You’re on track</strong>
              <p>No delivery risks or overdue milestones.</p>
            </div>
          )}
          <button
            className="report-download"
            onClick={() =>
              downloadCsv(`production-${date}.csv`, r.lines, [
                'code',
                'actual',
                'target',
                'efficiency',
                'dhu',
                'operators',
              ])
            }
          >
            <Download size={17} />
            Download floor report
            <ArrowUpRight size={16} />
          </button>
        </section>
      </div>
    </div>
  );
}
function Metric({
  label,
  value,
  unit,
  Icon,
  detail,
}: {
  label: string;
  value: string;
  unit: string;
  Icon: React.ComponentType<{ size: number }>;
  detail: React.ReactNode;
}) {
  return (
    <section className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon size={19} />
        </span>
      </div>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
      <div className="metric-detail">{detail}</div>
    </section>
  );
}
