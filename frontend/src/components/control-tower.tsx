'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowUpRight,
  Activity,
  CalendarDays,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Factory,
  Boxes,
  Users,
  Leaf,
} from 'lucide-react';
import { useInsights } from './advanced-panels';
import { today, number, money, Row } from '@/lib/types';
import { Loading, ErrorBanner } from './primitives';
export function ControlTower() {
  const [date, setDate] = useState(today()),
    { report: r, error, refresh } = useInsights(date);
  if (!r) return error ? <ErrorBanner message={error} retry={refresh} /> : <Loading />;
  const risks = [
    {
      count: r.procurement.late,
      title: 'Supplier receipts overdue',
      detail: 'Materials that can delay production release',
      href: '/procurement',
    },
    {
      count: r.maintenance.overdue,
      title: 'Maintenance past due',
      detail: 'Resolve equipment work orders before capacity is lost',
      href: '/equipment',
    },
    {
      count: r.quality.overdueCapa,
      title: 'Corrective actions overdue',
      detail: 'Close the quality loop with independent verification',
      href: '/assurance',
    },
    {
      count: r.stock.held,
      title: 'Stock lots on quality hold',
      detail: 'Held fabric cannot enter production',
      href: '/warehouse',
    },
    {
      count: r.workforce.expiredSkills,
      title: 'Expired worker qualifications',
      detail: 'Update training before station assignment',
      href: '/workforce',
    },
    {
      count: r.compliance.critical,
      title: 'Critical compliance requirements',
      detail: 'Evidence and a separate reviewer are required',
      href: '/governance',
    },
  ];
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <div className="eyebrow">EXCEPTION-DRIVEN FACTORY CONTROL</div>
          <h1>
            Control tower<span className="heading-dot">.</span>
          </h1>
          <p>Capacity, stock, quality and people. One operational picture.</p>
        </div>
        <label className="date-control">
          <CalendarDays size={18} />
          <input
            type="date"
            aria-label="Control tower date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </label>
      </div>
      {error && <ErrorBanner message={error} retry={refresh} />}
      <div className="tower-banner">
        <span className="tower-banner-icon">
          <Activity size={29} />
        </span>
        <div>
          <strong>{risks.reduce((n, r) => n + r.count, 0)} exceptions to review</strong>
          <p>Prioritized from recorded factory data. Select an area to investigate.</p>
        </div>
        <Link href="/capacity">
          Open capacity planner
          <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="tower-metrics">
        <TowerMetric
          Icon={Factory}
          label="Estimated OEE"
          value={r.oee.toFixed(1) + '%'}
          detail="Shift availability × SMV performance × good yield"
        />
        <TowerMetric
          Icon={Boxes}
          label="Tracked stock lots"
          value={number(r.stock.lots)}
          detail={`${r.stock.held} quality-held · ${r.stock.byWarehouse.length} warehouses`}
        />
        <TowerMetric
          Icon={Users}
          label="Present / recorded"
          value={`${r.workforce.present} / ${r.workforce.recorded}`}
          detail={`${number(r.workforce.overtimeMinutes)} overtime minutes`}
        />
        <TowerMetric
          Icon={ShieldCheck}
          label="Final audit pass rate"
          value={
            r.quality.passed + r.quality.failed
              ? ((r.quality.passed / (r.quality.passed + r.quality.failed)) * 100).toFixed(1) + '%'
              : 'No audits'
          }
          detail={`${r.quality.openCapa} CAPAs remain open`}
        />
      </div>
      <div className="tower-layout">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Exception inbox</h2>
              <p>Act on the cause, then follow the outcome.</p>
            </div>
            <span className="count-badge">{risks.filter((r) => r.count).length} areas</span>
          </div>
          <div className="risk-list">
            {risks.map((risk) => (
              <Link href={risk.href} key={risk.title}>
                <span className={risk.count ? 'risk-marker warning' : 'risk-marker'}>
                  {risk.count ? <AlertTriangle size={21} /> : <CheckCircle2 size={21} />}
                </span>
                <div>
                  <strong>{risk.title}</strong>
                  <p>{risk.detail}</p>
                </div>
                <b>{risk.count}</b>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Line reliability</h2>
              <p>OEE is an operational estimate using recorded loss and SMV data.</p>
            </div>
          </div>
          <div className="reliability-grid">
            {r.equipment.map((line: Row) => (
              <div key={line.id}>
                <div className="reliability-line">
                  <strong>{line.code}</strong>
                  <span>{line.oee.toFixed(1)}% OEE</span>
                </div>
                <div className="reliability-bars">
                  <span style={{ width: `${line.availability}%` }} />
                  <i style={{ width: `${line.performance}%` }} />
                  <b style={{ width: `${line.quality}%` }} />
                </div>
                <div className="reliability-labels">
                  <span>A {line.availability.toFixed(0)}%</span>
                  <span>P {line.performance.toFixed(0)}%</span>
                  <span>Q {line.quality.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="panel-bottom">
            <Link href="/equipment" className="text-link">
              Inspect losses & work orders
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
      </div>
      <div className="tower-lower">
        <section className="panel commercial-pulse">
          <div className="panel-head">
            <h2>Commercial pulse</h2>
            <Link href="/commercial" className="text-link">
              Cost sheets
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="pulse-numbers">
            <div>
              <span>Committed procurement</span>
              <strong>
                {r.procurement.committedMinor === null
                  ? 'Restricted'
                  : money(r.procurement.committedMinor)}
              </strong>
            </div>
            <div>
              <span>Average quoted margin</span>
              <strong>{r.costing ? r.costing.averageMargin.toFixed(1) + '%' : 'Restricted'}</strong>
            </div>
          </div>
          <p className="panel-caption">
            Purchase prices are converted with explicit recorded FX. Calculated BOM/SMV cost sheets
            explain every margin.
          </p>
        </section>
        <section className="panel impact-pulse">
          <div className="panel-head">
            <h2>
              <Leaf size={19} />
              Resource footprint
            </h2>
            <Link href="/governance" className="text-link">
              Ledger
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="impact-mini">
            <span>
              <strong>{number(r.impact.energyKwh)}</strong> kWh
            </span>
            <span>
              <strong>{number(r.impact.waterLiters)}</strong> liters
            </span>
            <span>
              <strong>
                {r.impact.scrapKg ? ((r.impact.recycledKg / r.impact.scrapKg) * 100).toFixed(0) : 0}
                %
              </strong>{' '}
              scrap recovered
            </span>
          </div>
          <p className="panel-caption">
            Energy and water are recorded measurements; emissions use the supplied estimate factor.
          </p>
        </section>
      </div>
    </div>
  );
}
function TowerMetric({
  Icon,
  label,
  value,
  detail,
}: {
  Icon: React.ComponentType<{ size: number }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article>
      <span className="tower-metric-icon">
        <Icon size={21} />
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}
