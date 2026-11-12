'use client';
import { ReactNode, useEffect, useRef } from 'react';
import { X, AlertCircle, PackageOpen, LoaderCircle } from 'lucide-react';
import { title } from '@/lib/types';
export function Badge({ value }: { value: string }) {
  const color = [
    'ACTIVE',
    'COMPLETED',
    'DELIVERED',
    'APPROVED',
    'EXPORTED',
    'SHIPPED',
    'CLOSED',
    'BULLETIN_READY',
    'PASSED',
    'PASS',
    'VERIFIED',
    'AVAILABLE',
    'LOW',
  ].includes(value)
    ? 'green'
    : [
          'CANCELLED',
          'ARCHIVED',
          'MAINTENANCE',
          'FAILED',
          'FAIL',
          'REJECTED',
          'CRITICAL',
          'HIGH',
        ].includes(value)
      ? 'red'
      : [
            'IN_PRODUCTION',
            'CUTTING',
            'CALCULATED',
            'PACKED',
            'BOM_READY',
            'SUBMITTED',
            'REVIEW',
            'IN_PROGRESS',
            'SIMULATED',
            'SEWING',
            'QC',
            'HOLD',
            'MEDIUM',
            'NORMAL',
          ].includes(value)
        ? 'orange'
        : 'neutral';
  return (
    <span className={`badge ${color}`}>
      <i />
      {title(value)}
    </span>
  );
}
export function ErrorBanner({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <AlertCircle size={19} />
      <span>{message}</span>
      {retry && <button onClick={retry}>Try again</button>}
    </div>
  );
}
export function Empty({
  title: heading = 'Nothing here yet',
  description = 'Add your first record to get started.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <PackageOpen size={28} />
      </div>
      <h3>{heading}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={28} />
      <span>Loading your workspace…</span>
    </div>
  );
}
export function Modal({
  title: heading,
  subtitle,
  children,
  onClose,
  wide = false,
  busy = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = () => {
    if (!busy) onClose();
  };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
      if (e.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handle);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', handle);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (!busy && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-head">
          <div>
            <h2 id="modal-title">{heading}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={busy}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
