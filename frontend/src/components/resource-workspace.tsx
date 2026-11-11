'use client';
import { useEffect, useState } from 'react';
import {
  Plus,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  Pencil,
  Trash2,
  Info,
} from 'lucide-react';
import { modules } from '@/lib/modules';
import { configs, nextStates } from '@/lib/administration';
import { Resource, Row, title, number, money } from '@/lib/types';
import { canRead, canWrite } from '@/lib/permissions';
import { useWorkspace, Workspace } from '@/lib/workspace';
import { api, downloadCsv } from '@/lib/api';
import { useSession } from './providers';
import { RecordForm } from './record-form';
import { Badge, ErrorBanner, Loading, Empty, Modal } from './primitives';
import { MaterialRequirements } from './material-requirements';
import { AdvancedModulePanel, AdvancedRecordDetails } from './advanced-panels';
import { MasterImport } from './master-import';
export function ResourceWorkspace({ module }: { module: string }) {
  const config = modules[module],
    workspace = useWorkspace(),
    { data, loading, error, refresh } = workspace,
    { user } = useSession();
  const available = config.resources.filter((r) => canRead(user?.role || '', r));
  const [resource, setResource] = useState<Resource>(available[0] || config.resources[0]),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState('ALL'),
    [page, setPage] = useState(0),
    [form, setForm] = useState<Row | 'new' | null>(null),
    [selected, setSelected] = useState<Row | null>(null),
    [toast, setToast] = useState(''),
    [actionError, setActionError] = useState(''),
    [busy, setBusy] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get('q') || '');
    if (params.get('new') === '1' && canWrite(user?.role || '', resource)) setForm('new');
    const line = params.get('line');
    if (line) setQuery(line);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 7000);
    return () => clearTimeout(t);
  }, [toast]);
  const changeTab = (r: Resource) => {
    setResource(r);
    setQuery('');
    setStatus('ALL');
    setPage(0);
  };
  if (loading) return <Loading />;
  if (!available.length)
    return (
      <Empty
        title="Access restricted"
        description="Your role does not have access to this module."
      />
    );
  const rc = configs[resource],
    writable = canWrite(user?.role || '', resource);
  const creatable = writable && !(resource === 'lots' && user?.role === 'QC') && !(resource==='bundles'&&!['FACTORY_ADMIN','LINE_CHIEF','SUPERVISOR'].includes(user?.role||''));
  const rows = (data[resource] || []).filter(
    (row) =>
      (status === 'ALL' || row.status === status) &&
      Object.entries(row).some(
        ([key, v]) =>
          String(v).toLowerCase().includes(query.toLowerCase()) ||
          (rc.fields.find((f) => f.key === key)?.ref &&
            workspace
              .label(rc.fields.find((f) => f.key === key)!.ref!, String(v))
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
  );
  const allStatuses = Array.from(
    new Set((data[resource] || []).map((r) => r.status).filter(Boolean)),
  );
  const paginated = rows.slice(page * 12, page * 12 + 12);
  const display = (row: Row, key: string) => {
    if (key === 'status') return <Badge value={row[key]} />;
    const field = rc.fields.find((f) => f.key === key);
    if (field?.ref) return workspace.label(field.ref, row[key]);
    if (key === 'unitCostMinor' && row.currency && row.currency !== 'BDT')
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: row.currency }).format(
        row[key] / 100,
      );
    if (key.endsWith('Minor')) return money(row[key]);
    if (key === 'marginPercent') return Number(row[key] || 0).toFixed(2) + '%';
    if (typeof row[key] === 'boolean') return row[key] ? 'Yes' : 'No';
    if (typeof row[key] === 'number') return number(row[key]);
    if (Array.isArray(row[key])) return row[key].join(', ') || '—';
    return row[key] ?? '—';
  };
  const header = (key: string) =>
    rc.fields.find((f) => f.key === key)?.label ||
    (
      {
        status: 'Status',
        totalMinor: 'Total earnings',
        rateMinor: 'Rate',
        amountMinor: 'Earnings',
        version: 'Revision',
        resolvedPcs: 'Rework resolved',
        active: 'Active',
        timezone: 'Timezone',
      } as Record<string, string>
    )[key] ||
    title(key);
  async function action(body: Row | Record<string, unknown>) {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      const result = await api(`/data/${resource}/${selected.id}/actions`, {
        method: 'POST',
        body: JSON.stringify({ ...body, expectedVersion: selected.version }),
      });
      setSelected(result.record);
      setToast(
        result.warnings?.length ? result.warnings.join(' · ') : 'Record updated successfully',
      );
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      await api(`/data/${resource}/${selected.id}`, { method: 'DELETE' });
      setSelected(null);
      setPage(0);
      setConfirmDelete(false);
      setToast('Draft deleted');
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <div className="eyebrow">{config.eyebrow}</div>
          <h1>
            {config.title}
            <span className="heading-dot">.</span>
          </h1>
          <p>{config.description}</p>
        </div>
        <div className="heading-actions">
          <button
            className="button"
            onClick={() =>
              downloadCsv(
                `${resource}.csv`,
                rows.map((r) =>
                  Object.fromEntries(
                    rc.columns.map((k) => [
                      k,
                      typeof display(r, k) === 'string' ? display(r, k) : r[k],
                    ]),
                  ),
                ),
                rc.columns,
              )
            }
          >
            <Download size={17} />
            Export CSV
          </button>
          {user?.role === 'FACTORY_ADMIN' &&
            ['buyers', 'workers', 'suppliers'].includes(resource) && (
              <MasterImport resource={resource} onSaved={refresh} />
            )}
          {creatable && resource !== 'factories' && (
            <button className="button primary" onClick={() => setForm('new')}>
              <Plus size={18} />
              New {rc.singular.toLowerCase()}
            </button>
          )}
        </div>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            ×
          </button>
        </div>
      )}
      {error && <ErrorBanner message={error} retry={refresh} />}
      <AdvancedModulePanel module={module} workspace={workspace} />
      <div className="tabs" role="tablist" aria-label={config.title}>
        {available.map((r) => (
          <button role="tab" aria-selected={r === resource} key={r} onClick={() => changeTab(r)}>
            {configs[r].name}
            <span>{data[r]?.length || 0}</span>
          </button>
        ))}
      </div>
      {module === 'inventory' && <MaterialRequirements workspace={workspace} />}
      <section className="panel data-panel">
        <div className="panel-head">
          <div>
            <h2>
              {rc.name} <span className="count-badge">{rows.length}</span>
            </h2>
            <p>{rc.description}</p>
          </div>
          <button className="icon-button" aria-label="Refresh records" onClick={refresh}>
            <RefreshCw size={17} />
          </button>
        </div>
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              aria-label="Search records"
              placeholder={`Search ${rc.name.toLowerCase()}…`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          {allStatuses.length > 0 && (
            <select
              aria-label="Filter status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="ALL">All statuses</option>
              {allStatuses.map((s) => (
                <option key={s} value={s}>
                  {title(s)}
                </option>
              ))}
            </select>
          )}
          <span className="table-hint">Select a record to view details</span>
        </div>
        {rows.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {rc.columns.map((k) => (
                      <th key={k}>{header(k)}</th>
                    ))}
                    <th>
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row) => (
                    <tr key={row.id}>
                      {rc.columns.map((k, i) => (
                        <td key={k}>
                          {i === 0 ? (
                            <button
                              className="record-link"
                              onClick={() => {
                                setSelected(row);
                                setActionError('');
                                setConfirmDelete(false);
                              }}
                            >
                              {display(row, k)}
                            </button>
                          ) : (
                            display(row, k)
                          )}
                        </td>
                      ))}
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`View ${rc.singular.toLowerCase()} details`}
                          onClick={() => {
                            setSelected(row);
                            setActionError('');
                            setConfirmDelete(false);
                          }}
                        >
                          <ArrowUpRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                Showing {page * 12 + 1}–{Math.min((page + 1) * 12, rows.length)} of {rows.length}{' '}
                records
              </span>
              <div>
                <button
                  className="button compact"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <button
                  className="button compact"
                  disabled={(page + 1) * 12 >= rows.length}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            title={
              query || status !== 'ALL' ? 'No matching records' : `No ${rc.name.toLowerCase()} yet`
            }
            description={query ? 'Try a different search or clear your filters.' : rc.description}
            action={
              creatable && resource !== 'factories' ? (
                <button className="button primary" onClick={() => setForm('new')}>
                  <Plus size={17} />
                  Add {rc.singular.toLowerCase()}
                </button>
              ) : undefined
            }
          />
        )}
      </section>
      {resource === 'production' && (
        <div className="info-note">
          <Info size={19} />
          <span>
            Efficiency = (output × style SMV) ÷ (operators × available minutes) × 100. Entries use
            Dhaka shift hours; corrections keep an audit trail.
          </span>
        </div>
      )}
      {form && (
        <RecordForm
          resource={resource}
          record={form === 'new' ? undefined : form}
          workspace={workspace}
          onClose={() => setForm(null)}
          onSaved={async (warnings) => {
            setForm(null);
            setToast(warnings.length ? warnings.join(' · ') : 'Record saved successfully');
            await refresh();
          }}
        />
      )}
      {selected && (
        <Modal
          title={`${rc.singular} details`}
          subtitle={selected.id}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
          wide
        >
          <div className="record-details">
            {actionError && <ErrorBanner message={actionError} />}
            <dl>
              {[
                ...rc.columns,
                ...rc.fields
                  .map((f) => f.key)
                  .filter((k) => !rc.columns.includes(k) && k !== 'password'),
              ].map((key) => (
                <div key={key}>
                  <dt>{header(key)}</dt>
                  <dd>{display(selected, key)}</dd>
                </div>
              ))}
            </dl>
            <AdvancedRecordDetails resource={resource} record={selected} />
            {resource === 'payroll' && selected.breakdown && (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Completed pcs</th>
                      <th>Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.breakdown.map((w: Row) => (
                      <tr key={w.workerId}>
                        <td>{w.name}</td>
                        <td>{number(w.pcs)}</td>
                        <td>{money(w.amountMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {writable && (
              <div className="detail-actions">
                {(!selected.status ||
                  ['DRAFT', 'PLANNED', 'OPEN',...(['maintenance','correctiveActions'].includes(resource)?['IN_PROGRESS']:[]),...(resource==='compliance'?['FAILED']:[]),...(resource==='scenarios'?['SIMULATED']:[])].includes(
                    selected.status,
                  )) &&
                  !['lots', 'lotIssues', 'bundles'].includes(resource) && (
                    <button
                      className="button"
                      onClick={() => {
                        setForm(selected);
                        setSelected(null);
                      }}
                    >
                      <Pencil size={16} />
                      Edit record
                    </button>
                  )}
                {nextStates[resource]?.[selected.status]?.map((state) => (
                  <button
                    className={`button ${state === 'CANCELLED' ? 'danger' : 'primary'}`}
                    key={state}
                    disabled={busy}
                    onClick={() => action({ status: state })}
                  >
                    {busy ? 'Updating…' : `Move to ${title(state)}`}
                  </button>
                ))}
                {resource === 'lots' &&
                  ['FACTORY_ADMIN', 'QC'].includes(user?.role || '') &&
                  selected.issuedQty === 0 && (
                    <>
                      <button
                        className="button primary"
                        disabled={busy}
                        onClick={() => action({ action: 'inspect', result: 'PASS' })}
                      >
                        Clear fabric QC
                      </button>
                      <button
                        className="button danger"
                        disabled={busy}
                        onClick={() => action({ action: 'inspect', result: 'FAIL' })}
                      >
                        Fail fabric QC
                      </button>
                    </>
                  )}
                {resource === 'qc' && selected.reworkPcs > selected.resolvedPcs && (
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      action({ action: 'resolve', pcs: selected.reworkPcs - selected.resolvedPcs })
                    }
                  >
                    Resolve {selected.reworkPcs - selected.resolvedPcs} rework pieces
                  </button>
                )}
                {resource === 'users' && selected.id !== user?.id && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => action({ active: !selected.active })}
                  >
                    {selected.active ? 'Deactivate user' : 'Reactivate user'}
                  </button>
                )}
                {(!selected.status || ['DRAFT', 'PLANNED'].includes(selected.status)) &&
                  ![
                    'factories',
                    'users',
                    'pieceEntries',
                    'production',
                    'qc',
                    'finishing',
                    'cartons',
                    'materials',
                    'lots',
                    'lotIssues',
                    'bundles',
                    'downtime',
                    'maintenance',
                    'attendance',
                    'skills',
                    'stations',
                    'qualityAudits',
                    'correctiveActions',
                    'compliance',
                    'subcontracts',
                    'sustainability',
                  ].includes(resource) && (
                    <button
                      className="button danger"
                      disabled={busy}
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 size={16} />
                      Delete draft
                    </button>
                  )}
              </div>
            )}
            {confirmDelete && (
              <div className="delete-confirm">
                <p>Delete this draft permanently? Records with dependencies will be kept.</p>
                <button className="button" disabled={busy} onClick={() => setConfirmDelete(false)}>
                  Keep record
                </button>
                <button className="button danger" disabled={busy} onClick={remove}>
                  Confirm deletion
                </button>
              </div>
            )}
            {resource === 'shipments' && (
              <a className="button" href={`/documents/${selected.id}`}>
                <ArrowUpRight size={17} />
                Invoice & packing documents
              </a>
            )}
            {resource === 'shipments' && (
              <a className="button" href={`/api/reports/packing/${selected.id}.csv`}>
                <Download size={17} />
                Download packing list
              </a>
            )}
            {resource === 'payroll' && ['APPROVED', 'EXPORTED'].includes(selected.status) && (
              <a className="button" href={`/api/reports/payroll/${selected.id}.csv`}>
                <Download size={17} />
                Download approved payroll CSV
              </a>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
