'use client';
import { useEffect, useRef } from 'react';
import { T } from '../lib/theme';

export type JobStatus = 'processing' | 'complete' | 'failed' | null;

type Props = {
  status: JobStatus;
  /** Label shown while processing (defaults to "Processing…") */
  processingLabel?: string;
  /** Full message shown on success */
  completeMessage?: string;
  /** Full error message shown on failure (plain English, no raw codes) */
  failedMessage?: string;
  /** Optional CTA rendered inside the complete state */
  completeCta?: React.ReactNode;
  /** Optional escape link rendered inside the failed state */
  escapeHref?: string;
  escapeLabel?: string;
  /** Called if job stays in "processing" for more than timeoutMs (default 30 000) */
  onTimeout?: () => void;
  timeoutMs?: number;
  /** Dismiss callback — lets parent clear the banner */
  onDismiss?: () => void;
};

export default function JobStatusBanner({
  status,
  processingLabel = 'Processing…',
  completeMessage,
  failedMessage,
  completeCta,
  escapeHref = '/',
  escapeLabel = '← Back to Dashboard',
  onTimeout,
  timeoutMs = 30_000,
  onDismiss,
}: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start a 30 s timeout whenever we enter "processing"
  useEffect(() => {
    if (status === 'processing') {
      timerRef.current = setTimeout(() => {
        onTimeout?.();
      }, timeoutMs);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, timeoutMs, onTimeout]);

  if (!status) return null;

  // ── Processing ───────────────────────────────────────────────────────────────
  if (status === 'processing') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm,
        padding: '14px 18px',
        marginBottom: 16,
      }}>
        <Spinner />
        <span style={{ fontSize: 14, fontWeight: 600, color: T.navy }}>{processingLabel}</span>
      </div>
    );
  }

  // ── Complete ─────────────────────────────────────────────────────────────────
  if (status === 'complete') {
    return (
      <div style={{
        background: T.greenLight,
        border: `1px solid ${T.green}44`,
        borderRadius: T.radiusSm,
        padding: '14px 18px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <span style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>✓</span>
        <div style={{ flex: 1 }}>
          {completeMessage && (
            <div style={{ fontSize: 14, fontWeight: 600, color: T.greenDark }}>{completeMessage}</div>
          )}
          {completeCta && <div style={{ marginTop: 8 }}>{completeCta}</div>}
        </div>
        {onDismiss && (
          <DismissBtn onClick={onDismiss} />
        )}
      </div>
    );
  }

  // ── Failed ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: T.coralLight,
      border: `1px solid ${T.coral}44`,
      borderRadius: T.radiusSm,
      padding: '14px 18px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
    }}>
      <span style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        {failedMessage && (
          <div style={{ fontSize: 14, fontWeight: 600, color: T.coral }}>{failedMessage}</div>
        )}
        {escapeHref && (
          <a href={escapeHref} style={{
            display: 'inline-block',
            marginTop: 8,
            fontSize: 13,
            color: T.navy,
            textDecoration: 'underline',
            fontWeight: 600,
          }}>
            {escapeLabel}
          </a>
        )}
      </div>
      {onDismiss && (
        <DismissBtn onClick={onDismiss} />
      )}
    </div>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes kw-job-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: `2.5px solid ${T.border}`,
        borderTopColor: T.teal,
        flexShrink: 0,
        animation: 'kw-job-spin 0.7s linear infinite',
      }} />
    </>
  );
}

function DismissBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: T.inkMuted,
        fontSize: 16,
        lineHeight: 1,
        padding: 0,
        flexShrink: 0,
      }}
      aria-label="Dismiss"
    >
      ×
    </button>
  );
}
