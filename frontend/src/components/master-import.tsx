'use client';
import { useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { api, downloadCsv } from '@/lib/api';
import { Resource } from '@/lib/types';
import { configs } from '@/lib/administration';
import { Modal, ErrorBanner } from './primitives';
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('CSV contains an unclosed quote');
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  const [headers, ...data] = rows;
  if (!headers?.length) throw new Error('CSV is empty');
  if (new Set(headers).size !== headers.length) throw new Error('CSV has duplicate headers');
  return data.map((values, i) => {
    if (values.length !== headers.length)
      throw new Error(`CSV row ${i + 2} has ${values.length} columns; expected ${headers.length}`);
    return Object.fromEntries(headers.map((h, j) => [h.trim(), values[j].trim()]));
  });
}
export function MasterImport({
  resource,
  onSaved,
}: {
  resource: Resource;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [rows, setRows] = useState<Record<string, string>[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [file, setFile] = useState('');
  const fields = configs[resource].fields;
  async function upload() {
    setBusy(true);
    setError('');
    try {
      await api(`/tools/import/${resource}`, { method: 'POST', body: JSON.stringify({ rows }) });
      await onSaved();
      setOpen(false);
      setRows([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="button" onClick={() => setOpen(true)}>
        <Upload size={17} />
        Import CSV
      </button>
      {open && (
        <Modal
          title={`Import ${configs[resource].name.toLowerCase()}`}
          subtitle="Up to 500 rows. Every row validates before one atomic database transaction."
          onClose={() => !busy && setOpen(false)}
          wide
        >
          <div className="record-details">
            {error && <ErrorBanner message={error} />}
            <div className="import-controls">
              <button
                className="button"
                onClick={() =>
                  downloadCsv(
                    `${resource}-template.csv`,
                    [],
                    fields.map((f) => f.key),
                  )
                }
              >
                <Download size={17} />
                Download header template
              </button>
              <label className="file-label">
                Choose CSV
                <input
                  aria-label="Master CSV file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 2 * 1024 * 1024) {
                      setError('CSV must be smaller than 2 MB');
                      return;
                    }
                    try {
                      const parsed = parseCsv(await f.text());
                      if (parsed.length > 500) throw new Error('Import at most 500 rows');
                      setRows(parsed);
                      setFile(f.name);
                      setError('');
                    } catch (error) {
                      setError((error as Error).message);
                      setRows([]);
                    }
                  }}
                />
              </label>
            </div>
            <p>
              {file} · {rows.length} rows ready for review
            </p>
            {rows.length > 0 && (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {Object.keys(rows[0]).map((k) => (
                        <th key={k}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 8).map((r, i) => (
                      <tr key={i}>
                        {Object.values(r).map((v, j) => (
                          <td key={j}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="detail-actions">
              <button className="button primary" disabled={!rows.length || busy} onClick={upload}>
                {busy ? 'Importing…' : `Import ${rows.length} records`}
              </button>
            </div>
            <p>
              Duplicate references or an invalid row roll back the entire import. Existing records
              are preserved.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
