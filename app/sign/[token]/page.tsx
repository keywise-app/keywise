'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DocumentSigning from '../../components/DocumentSigning';

const T = {
  navy: '#0F3460',
  teal: '#00D4AA',
  tealLight: '#E0FAF5',
  bg: '#F0F4FF',
  border: '#E0E6F0',
  inkMuted: '#8892A4',
  greenLight: '#E8F8F0',
  greenDark: '#00875A',
  coral: '#FF6B6B',
  coralLight: '#FFEDED',
  radius: 12,
};

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'loading' | 'ready' | 'signed' | 'already_signed' | 'expired' | 'error'>('loading');
  const [docData, setDocData] = useState<{
    tenant_name: string;
    document_name: string;
    document_type: string;
    file_url: string;
    landlord_email?: string;
    inspection?: any;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [signedAt, setSignedAt] = useState('');
  const [tenantNotes, setTenantNotes] = useState<Record<string, string>>({});
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});
  const [justSignedAt, setJustSignedAt] = useState<Date | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeText, setDisputeText] = useState('');
  const [disputeSent, setDisputeSent] = useState(false);

  const toggleRoom = (roomName: string) =>
    setExpandedRooms(prev => ({ ...prev, [roomName]: !prev[roomName] }));
  const setNote = (roomName: string, value: string) =>
    setTenantNotes(prev => ({ ...prev, [roomName]: value }));

  useEffect(() => {
    if (!token) return;
    fetch(`/api/sign-document?token=${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, data: d })))
      .then(({ ok, status, data }) => {
        if (ok) {
          setDocData(data);
          setState('ready');
        } else if (status === 409) {
          setSignedAt(data.signed_at || '');
          setState('already_signed');
        } else if (status === 410) {
          setState('expired');
        } else {
          setErrorMsg(data.error || 'Something went wrong.');
          setState('error');
        }
      })
      .catch(() => { setErrorMsg('Network error.'); setState('error'); });
  }, [token]);

  const landlordEmail = docData?.landlord_email || 'hello@keywise.app';
  const documentName = docData?.document_name || 'my document';
  const resendMailto = `mailto:${landlordEmail}?subject=${encodeURIComponent(`Please resend my signing link for ${documentName}`)}`;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      {/* Topbar */}
      <div style={{ background: T.navy, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Keywise</div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px' }}>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', padding: 60, color: T.inkMuted, fontSize: 14 }}>
            Loading document…
          </div>
        )}

        {state === 'already_signed' && (
          <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', boxShadow: '0 2px 12px rgba(15,52,96,0.08)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, marginBottom: 8 }}>Already Signed</div>
            <div style={{ fontSize: 14, color: T.inkMuted, marginBottom: 24 }}>
              This document has already been signed{signedAt ? ` on ${signedAt.slice(0, 10)}` : ''}.
            </div>
            <a
              href="/tenant"
              style={{ fontSize: 14, color: T.teal, fontWeight: 600, textDecoration: 'none' }}
            >
              ← Go to tenant portal
            </a>
          </div>
        )}

        {state === 'expired' && (
          <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', boxShadow: '0 2px 12px rgba(15,52,96,0.08)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏰</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, marginBottom: 8 }}>Link Expired</div>
            <div style={{ fontSize: 14, color: T.inkMuted, marginBottom: 24 }}>
              This signing link has expired. Your landlord can send you a new one.
            </div>
            <a
              href={resendMailto}
              style={{
                display: 'inline-block',
                background: T.teal,
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                padding: '10px 22px',
                borderRadius: 8,
                textDecoration: 'none',
                marginBottom: 16,
              }}
            >
              Request a new link
            </a>
            <div>
              <a
                href="/tenant"
                style={{ fontSize: 14, color: T.teal, fontWeight: 600, textDecoration: 'none' }}
              >
                ← Go to tenant portal
              </a>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', boxShadow: '0 2px 12px rgba(15,52,96,0.08)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, marginBottom: 8 }}>Something went wrong</div>
            <div style={{ fontSize: 14, color: T.inkMuted, marginBottom: 6 }}>
              There&apos;s a problem with this link.
            </div>
            {errorMsg && (
              <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 24 }}>{errorMsg}</div>
            )}
            <a
              href={resendMailto}
              style={{
                display: 'inline-block',
                background: T.teal,
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                padding: '10px 22px',
                borderRadius: 8,
                textDecoration: 'none',
                marginBottom: 16,
              }}
            >
              Request a new link
            </a>
            <div>
              <a
                href="/tenant"
                style={{ fontSize: 14, color: T.teal, fontWeight: 600, textDecoration: 'none' }}
              >
                ← Go to tenant portal
              </a>
            </div>
          </div>
        )}

        {state === 'signed' && docData && (() => {
          const isInspection = docData.document_type === 'inspection' || !!docData.inspection;
          const withinDispute = justSignedAt
            ? Date.now() - justSignedAt.getTime() < 24 * 60 * 60 * 1000
            : false;
          const disputeMailto = `mailto:${landlordEmail}?subject=${encodeURIComponent(`Dispute: ${documentName}`)}&body=${encodeURIComponent(`Hi,\n\nI've just signed "${documentName}" but I'd like to raise a concern about the following:\n\n${disputeText}\n\n— ${docData.tenant_name}`)}`;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Part 1: Confirmation + PDF access */}
              <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', boxShadow: '0 2px 12px rgba(15,52,96,0.08)' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: T.greenLight, marginBottom: 20 }}>
                  <span style={{ fontSize: 32, color: T.greenDark }}>✓</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.navy, marginBottom: 8 }}>Document Signed</div>
                <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.6, marginBottom: 24 }}>
                  You'll receive a confirmation email shortly. Keep it for your records.
                </div>
                {docData.file_url && (
                  <a
                    href={docData.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      background: T.teal,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 14,
                      padding: '10px 22px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      marginBottom: 16,
                    }}
                  >
                    View what you signed →
                  </a>
                )}
                <div>
                  <a
                    href="/tenant"
                    style={{ fontSize: 14, color: T.teal, fontWeight: 600, textDecoration: 'none' }}
                  >
                    ← Go to tenant portal
                  </a>
                </div>
              </div>

              {/* Part 2: Dispute window (inspection reports only, within 24h) */}
              {isInspection && (
                <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, boxShadow: '0 2px 12px rgba(15,52,96,0.08)' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 6 }}>Something look wrong?</div>
                  {withinDispute ? (
                    disputeSent ? (
                      <div style={{ fontSize: 14, color: T.greenDark, fontWeight: 600 }}>
                        ✓ Concern sent. Your landlord will be in touch.
                      </div>
                    ) : disputeOpen ? (
                      <div>
                        <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 10 }}>
                          Describe what looks wrong. We'll draft an email to your landlord.
                        </div>
                        <textarea
                          value={disputeText}
                          onChange={e => setDisputeText(e.target.value)}
                          placeholder={`e.g. "The bathroom was rated Fair but it was in good condition when I moved in."`}
                          rows={4}
                          style={{
                            width: '100%', boxSizing: 'border-box' as const,
                            border: `1.5px solid ${T.border}`, borderRadius: 8,
                            padding: '10px 12px', fontSize: 13, outline: 'none',
                            color: T.navy, background: '#fff', resize: 'vertical',
                            fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 10,
                          }}
                        />
                        <div style={{ display: 'flex', gap: 10 }}>
                          <a
                            href={disputeMailto}
                            onClick={() => setDisputeSent(true)}
                            style={{
                              display: 'inline-block',
                              background: T.coral,
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: 13,
                              padding: '9px 18px',
                              borderRadius: 8,
                              textDecoration: 'none',
                            }}
                          >
                            Send concern to landlord →
                          </a>
                          <button
                            onClick={() => setDisputeOpen(false)}
                            style={{
                              fontSize: 13, color: T.inkMuted, fontWeight: 600,
                              background: 'none', border: 'none', cursor: 'pointer', padding: '9px 0',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 12 }}>
                          You have 24 hours after signing to flag a concern about this inspection report.
                        </div>
                        <button
                          onClick={() => setDisputeOpen(true)}
                          style={{
                            fontSize: 14, fontWeight: 700, color: T.coral,
                            background: T.coralLight, border: `1px solid ${T.coral}`,
                            borderRadius: 8, padding: '9px 18px', cursor: 'pointer',
                          }}
                        >
                          Raise a concern →
                        </button>
                      </div>
                    )
                  ) : (
                    <div style={{ fontSize: 13, color: T.inkMuted }}>
                      The 24-hour dispute window has passed.{' '}
                      <a href={`mailto:${landlordEmail}`} style={{ color: T.teal, fontWeight: 600, textDecoration: 'none' }}>
                        Contact your landlord
                      </a>{' '}
                      directly if you have concerns.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {state === 'ready' && docData && (
          <>
            {/* Inspection report display */}
            {docData.inspection && (
              <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(15,52,96,0.08)' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.navy, marginBottom: 4 }}>
                  {docData.inspection.type === 'move_in' ? 'Move-In' : 'Move-Out'} Inspection Report
                </div>
                <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>
                  {docData.inspection.property} — {new Date(docData.inspection.created_at).toLocaleDateString()}
                </div>

                {docData.inspection.overall_condition && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: T.inkMuted }}>Overall Condition: </span>
                    <span style={{ fontWeight: 700, color: T.navy }}>{docData.inspection.overall_condition}</span>
                  </div>
                )}

                {(docData.inspection.rooms || []).map((room: any, i: number) => (
                  <div key={i} style={{ background: '#F0F4FF', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>{room.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {room.condition && (
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: room.condition === 'Excellent' ? '#E8F8F0' : room.condition === 'Good' ? T.tealLight : room.condition === 'Fair' ? '#FFF8E0' : '#FFF0F0',
                            color: room.condition === 'Excellent' ? T.greenDark : room.condition === 'Good' ? T.teal : room.condition === 'Fair' ? '#9A6500' : T.coral,
                          }}>{room.condition}</span>
                        )}
                        <button
                          onClick={() => toggleRoom(room.name)}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                            border: `1px solid ${tenantNotes[room.name]?.trim() ? T.coral : T.border}`,
                            background: tenantNotes[room.name]?.trim() ? T.coralLight : '#fff',
                            color: tenantNotes[room.name]?.trim() ? T.coral : T.inkMuted,
                            cursor: 'pointer',
                          }}
                        >
                          {tenantNotes[room.name]?.trim() ? '📝 Note added' : '+ Dispute / Add note'}
                        </button>
                      </div>
                    </div>
                    {room.notes && <div style={{ fontSize: 13, color: '#4A5068', lineHeight: 1.6 }}>{room.notes}</div>}
                    {expandedRooms[room.name] && (
                      <div style={{ marginTop: 10 }}>
                        <textarea
                          value={tenantNotes[room.name] || ''}
                          onChange={e => setNote(room.name, e.target.value)}
                          placeholder="Add your note (e.g. 'Kitchen was clean — no damage')"
                          rows={3}
                          style={{
                            width: '100%', boxSizing: 'border-box' as const,
                            border: `1.5px solid ${T.border}`, borderRadius: 8,
                            padding: '10px 12px', fontSize: 13, outline: 'none',
                            color: T.navy, background: '#fff', resize: 'vertical',
                            fontFamily: "inherit", lineHeight: 1.6,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {docData.inspection.notes && (
                  <div style={{ background: T.tealLight, borderRadius: 10, padding: 14, marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.teal, textTransform: 'uppercase', marginBottom: 4 }}>General Notes</div>
                    <div style={{ fontSize: 13, color: T.navy, lineHeight: 1.6 }}>{docData.inspection.notes}</div>
                  </div>
                )}

                {docData.inspection.report_text && (
                  <div style={{ background: '#F8FAFF', borderRadius: 10, padding: 14, marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', marginBottom: 4 }}>Full Report</div>
                    <div style={{ fontSize: 13, color: T.navy, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{docData.inspection.report_text}</div>
                  </div>
                )}
              </div>
            )}

            <DocumentSigning
              token={token}
              tenantName={docData.tenant_name}
              documentName={docData.document_name}
              documentType={docData.document_type}
              fileUrl={docData.file_url}
              tenantNotes={tenantNotes}
              onSigned={() => { setState('signed'); setJustSignedAt(new Date()); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
