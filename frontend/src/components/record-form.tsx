'use client';
import { useState, FormEvent } from 'react';
import { Save, LoaderCircle } from 'lucide-react';
import { configs } from '@/lib/administration';
import { Resource, Row, today, title } from '@/lib/types';
import { Workspace } from '@/lib/workspace';
import { api } from '@/lib/api';
import { Modal, ErrorBanner } from './primitives';
import { useSession } from './providers';
export function RecordForm({
  resource,
  record,
  workspace,
  onClose,
  onSaved,
}: {
  resource: Resource;
  record?: Row;
  workspace: Workspace;
  onClose: () => void;
  onSaved: (warnings: string[]) => void;
}) {
  const config = configs[resource],
    { user } = useSession();
  const [values, setValues] = useState<Record<string, any>>(() =>
    Object.fromEntries(
      config.fields.map((f) => [
        f.key,
        f.type === 'password'
          ? ''
          : (record?.[f.key] ??
            f.default ??
            (f.type === 'date'
              ? today()
              : f.type === 'checkbox'
                ? false
                : f.type === 'lines'
                  ? []
                  : f.ref
                    ? (workspace.data[f.ref] || []).find(
                        (r) =>
                          f.ref !== 'lines' ||
                          !['LINE_CHIEF', 'SUPERVISOR'].includes(user?.role || '') ||
                          user?.lineIds.includes(r.id),
                      )?.id || ''
                    : '')),
      ]),
    ),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const update = (key: string, value: unknown) => setValues((v) => ({ ...v, [key]: value }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = Object.fromEntries(
        config.fields.map((f) => [
          f.key,
          f.type === 'number' ? Number(values[f.key]) : values[f.key],
        ]),
      );
      const result = await api(`/data/${resource}${record ? `/${record.id}` : ''}`, {
        method: record ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      onSaved(result.warnings || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${record ? 'Edit' : 'New'} ${config.singular.toLowerCase()}`}
      subtitle={config.description}
      onClose={() => !busy && onClose()}
      wide={config.fields.length > 6}
    >
      <form onSubmit={submit} className="record-form">
        {error && <ErrorBanner message={error} />}
        <div className={`form-fields ${config.fields.length > 5 ? 'two-column' : ''}`}>
          {config.fields.map((f) => (
            <label key={f.key} className={f.type === 'checkbox' ? 'checkbox-field' : ''}>
              {f.label}
              {f.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  aria-label={f.label}
                  checked={!!values[f.key]}
                  onChange={(e) => update(f.key, e.target.checked)}
                />
              ) : f.type === 'lines' ? (
                <div className="line-checkboxes">
                  {workspace.data.lines?.map((line) => (
                    <span key={line.id}>
                      <input
                        aria-label={line.code}
                        type="checkbox"
                        checked={(values[f.key] || []).includes(line.id)}
                        onChange={(e) =>
                          update(
                            f.key,
                            e.target.checked
                              ? [...(values[f.key] || []), line.id]
                              : (values[f.key] || []).filter((id: string) => id !== line.id),
                          )
                        }
                      />
                      {line.code}
                    </span>
                  ))}
                </div>
              ) : f.type === 'select' ? (
                <select
                  required
                  aria-label={f.label}
                  aria-describedby={f.hint ? `${f.key}-hint` : undefined}
                  value={values[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                >
                  <option value="" disabled>
                    Choose {f.label.toLowerCase()}
                  </option>
                  {f.ref
                    ? (workspace.data[f.ref] || [])
                        .filter(
                          (r) =>
                            f.ref !== 'lines' ||
                            !['LINE_CHIEF', 'SUPERVISOR'].includes(user?.role || '') ||
                            user?.lineIds.includes(r.id),
                        )
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {workspace.label(f.ref!, r.id)}
                            {r.name && r.code ? ` · ${r.name}` : ''}
                          </option>
                        ))
                    : f.options?.map((o) => (
                        <option key={o} value={o}>
                          {o.length > 3 ? title(o) : o}
                        </option>
                      ))}
                </select>
              ) : (
                <input
                  type={f.type || 'text'}
                  aria-label={f.label}
                  aria-describedby={f.hint ? `${f.key}-hint` : undefined}
                  value={values[f.key]}
                  required={!f.optional}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  minLength={f.type === 'password' ? 10 : undefined}
                  maxLength={
                    f.type === 'password' ? 128 : f.type === 'text' || !f.type ? 180 : undefined
                  }
                  autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                  onChange={(e) => update(f.key, e.target.value)}
                />
              )}{' '}
              {f.hint && (
                <span id={`${f.key}-hint`} className="field-hint">
                  {f.hint}
                </span>
              )}
            </label>
          ))}
        </div>
        <div className="form-footer">
          <span>Changes are saved to your factory.</span>
          <button type="button" className="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <LoaderCircle size={17} className="spin" /> : <Save size={17} />}{' '}
            {busy ? 'Saving…' : 'Save record'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
