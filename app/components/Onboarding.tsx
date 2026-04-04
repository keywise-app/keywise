'use client';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T, input, label, btn } from '../lib/theme';

type FileStatus = {
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: any;
  actions?: string[];
  error?: string;
};

const DOC_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  lease: { label: 'Lease Agreement', icon: '📄' },
  addendum: { label: 'Lease Addendum', icon: '📎' },
  insurance_renters: { label: "Renter's Insurance", icon: '🛡️' },
  insurance_property: { label: 'Property Insurance', icon: '🏠' },
  inspection: { label: 'Inspection Report', icon: '🔍' },
  move_in: { label: 'Move-In Checklist', icon: '📋' },
  move_out: { label: 'Move-Out Checklist', icon: '📦' },
  repair_receipt: { label: 'Repair Receipt', icon: '🔧' },
  improvement: { label: 'Capital Improvement', icon: '🏗️' },
  tax: { label: 'Tax Document', icon: '💰' },
  mortgage: { label: 'Mortgage Document', icon: '🏦' },
  other: { label: 'Document', icon: '📎' },
};

function KeywiseLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill={T.navy} />
      <circle cx="13" cy="16" r="5.5" fill="none" stroke={T.teal} strokeWidth="2.5" />
      <circle cx="13" cy="16" r="2" fill={T.teal} />
      <rect x="17.5" y="14.75" width="8" height="2.5" rx="1.25" fill={T.teal} />
      <rect x="22" y="17.25" width="4" height="2" rx="1" fill={T.teal} />
      <rect x="19" y="17.25" width="2.5" height="2" rx="1" fill={T.teal} />
    </svg>
  );
}

function ProgressBar({ step, skipProfile }: { step: number; skipProfile?: boolean }) {
  const steps = skipProfile
    ? ['Welcome', 'Import', 'Review', 'Done']
    : ['Welcome', 'Profile', 'Import', 'Review', 'Done'];
  // Map actual step number to display index
  const displayStep = skipProfile && step >= 2 ? step - 1 : step;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i < displayStep ? T.teal : i === displayStep ? T.navy : T.border,
              color: i < displayStep ? T.navy : 'white',
              fontSize: i < displayStep ? 14 : 13, fontWeight: 700,
              transition: 'all 0.3s',
            }}>
              {i < displayStep ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: i === displayStep ? T.navy : T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {s}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: 48, height: 2, background: i < displayStep ? T.teal : T.border, margin: '0 4px', marginBottom: 20, transition: 'background 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ full_name: '', email: '', phone: '', company: '', address: '' });
  const [profileComplete, setProfileComplete] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [aiWelcome, setAiWelcome] = useState('');
  const [loadingWelcome, setLoadingWelcome] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (p?.full_name) {
        setProfile({ full_name: p.full_name || '', email: p.email || '', phone: p.phone || '', company: p.company || '', address: p.address || '' });
        setProfileComplete(true);
      }
    })();
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingProfile(false); return; }
    await supabase.from('profiles').upsert({ id: user.id, ...profile });
    setSavingProfile(false);
    setStep(2);
  };

  const getAiWelcome = async () => {
    setLoadingWelcome(true);
    // Wait 20 seconds after document processing before calling Claude
    await new Promise(resolve => setTimeout(resolve, 20000));

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Write a 1-sentence welcome message for a landlord who just set up Keywise. Be warm and brief.',
        }),
      });
      const data = await res.json();

      if (!data.result || data.result.includes('error') || data.result.includes('Error')) {
        setAiWelcome('Your portfolio is set up and ready. Head to your dashboard to get started.');
      } else {
        setAiWelcome(data.result);
      }
    } catch {
      setAiWelcome('Your portfolio is set up and ready. Head to your dashboard to get started.');
    }
    setLoadingWelcome(false);
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    setFiles(prev => [
      ...prev,
      ...arr
        .filter(f => !prev.find(p => p.file.name === f.name))
        .map(f => ({ file: f, status: 'pending' as const })),
    ]);
  };

  const processFile = async (fileStatus: FileStatus): Promise<FileStatus> => {
    const MAX_RETRIES = 3;
    let lastError = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // Upload to Supabase Storage first (avoids Vercel 4.5MB body limit for large PDFs)
        const ext = fileStatus.file.name.split('.').pop();
        const path = (user?.id || 'anon') + '/import-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
        const { error: uploadError } = await supabase.storage.from('documents').upload(path, fileStatus.file);

        if (uploadError) {
          lastError = 'Upload failed: ' + uploadError.message;
          throw new Error(lastError);
        }

        const { data: urlData } = await supabase.storage.from('documents').createSignedUrl(path, 300);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const res = await fetch('/api/process-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileUrl: urlData?.signedUrl,
            fileType: fileStatus.file.type || 'application/pdf',
            fileName: fileStatus.file.name,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          await supabase.storage.from('documents').remove([path]);
          lastError = 'Processing failed: ' + res.status;
          throw new Error(lastError);
        }

        const data = await res.json();

        // Clean up temp file after processing
        await supabase.storage.from('documents').remove([path]);

        if (data.error) {
          lastError = data.error;
          throw new Error(lastError);
        }

        const actions: string[] = [];
        if (data.document_type === 'lease') {
          if (data.property_address) actions.push('Create property: ' + data.property_address.split(',')[0]);
          if (data.tenant_name) actions.push('Create lease: ' + data.tenant_name);
          if (data.monthly_rent) actions.push('Rent: $' + data.monthly_rent + '/mo');
        }
        if (['insurance_renters', 'insurance_property'].includes(data.document_type)) {
          actions.push('Store insurance document');
          if (data.expiry_date) actions.push('Track expiry: ' + data.expiry_date);
        }
        if (['repair_receipt', 'improvement'].includes(data.document_type)) {
          if (data.amount) actions.push('Create expense: $' + data.amount);
          if (data.vendor) actions.push('Vendor: ' + data.vendor);
        }
        if (!actions.length) {
          actions.push('Store as ' + (DOC_TYPE_LABELS[data.document_type]?.label || 'document'));
        }

        return { ...fileStatus, status: 'done', result: data, actions };
      } catch (err: any) {
        lastError = err.name === 'AbortError' ? 'Timed out after 30 seconds' : (err.message || lastError || 'Could not process file');
        console.log(`[processFile] Attempt ${attempt} failed for ${fileStatus.file.name}:`, lastError);

        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          setFiles(prev => prev.map(p =>
            p.file.name === fileStatus.file.name
              ? { ...p, status: 'processing' as const, error: `Retrying (${attempt}/${MAX_RETRIES})...` }
              : p
          ));
        }
      }
    }

    return { ...fileStatus, status: 'error', error: 'Failed after ' + MAX_RETRIES + ' attempts: ' + lastError };
  };

  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });

  const processAll = async () => {
    const pending = files.filter(f => f.status === 'pending');
    if (pending.length === 0) { setStep(3); return; }
    setProcessing(true);
    setProcessProgress({ current: 0, total: pending.length });

    // Mark all as processing, then process in parallel
    setFiles(prev => prev.map(p => p.status === 'pending' ? { ...p, status: 'processing' } : p));

    const results = await Promise.all(
      pending.map(async (f) => {
        const result = await processFile(f);
        setProcessProgress(prev => ({ ...prev, current: prev.current + 1 }));
        setFiles(prev => prev.map(p => p.file.name === f.file.name ? result : p));
        return result;
      })
    );

    setProcessing(false);
    setStep(3);
  };
  const importAll = async () => {
    setImporting(true);
    const log: string[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setImporting(false); return; }

    // Track buildings created in this session to prevent duplicates
    const createdBuildings = new Map<string, string>(); // key -> buildingId

    for (const fileStatus of files.filter(f => f.status === 'done' && f.result)) {
      const r = fileStatus.result;
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(fileStatus.file);
        });
        const ext = fileStatus.file.name.split('.').pop();
        const filePath = user.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
        const blob = await fetch('data:' + fileStatus.file.type + ';base64,' + base64).then(r => r.blob());
        await supabase.storage.from('documents').upload(filePath, blob);

        if (r.document_type === 'lease' && (r.building_address || r.property_address)) {
          const unitNum = r.unit_number || '';
          const buildingAddress = r.building_address ||
            r.property_address?.replace(/,?\s*(unit|apt|apartment|suite|#)\s*[\w]+/gi, '').trim();
          const buildingKey = buildingAddress.split(',')[0].toLowerCase().trim();

          let buildingId: string | null = null;

          // Check in-memory cache first (prevents duplicates within same import)
          if (createdBuildings.has(buildingKey)) {
            buildingId = createdBuildings.get(buildingKey)!;
          } else {
            // Check existing buildings in DB
            const { data: existingBuildings } = await supabase.from('buildings').select('id, address').eq('user_id', user.id);
            const existingBld = existingBuildings?.find((b: any) =>
              b.address?.toLowerCase().includes(buildingKey)
            );
            buildingId = existingBld?.id || null;
          }

          if (!buildingId) {
            const { data: newBldArr } = await supabase.from('buildings').insert({
              user_id: user.id, address: buildingAddress,
              type: r.property_type || (unitNum ? 'apartment' : 'Single Family'),
              num_units: unitNum ? 2 : 1, mortgage: 0, insurance: 0,
            }).select('id');
            const newBld = newBldArr?.[0];
            if (newBld) {
              buildingId = newBld.id;
              createdBuildings.set(buildingKey, newBld.id);
              log.push('✓ Created property: ' + buildingAddress.split(',')[0]);
            } else {
              log.push('✗ Could not create building');
            }
          }

          // Only create a unit record if there's a unit number (multi-unit)
          if (buildingId && unitNum) {
            const { data: existingUnits } = await supabase.from('properties').select('id, unit_number').eq('building_id', buildingId).eq('is_unit', true);
            const unitExists = existingUnits?.some((u: any) =>
              u.unit_number?.toLowerCase() === unitNum.toLowerCase()
            );
            if (!unitExists) {
              const { error: unitError } = await supabase.from('properties').insert({
                user_id: user.id, building_id: buildingId,
                address: r.property_address,
                unit_number: unitNum, is_unit: true,
                beds: +r.beds || null, baths: +r.baths || null, sqft: +r.sqft || null,
                current_rent: parseFloat(r.monthly_rent) || 0,
              });
              if (unitError) {
                log.push('✗ Could not create unit: ' + unitError.message);
              } else {
                log.push('✓ Created unit: Unit ' + unitNum);
              }
            } else {
              log.push('→ Unit ' + unitNum + ' already exists');
            }
          }
        }

        if (r.document_type === 'lease' && r.tenant_name && (r.building_address || r.property_address)) {
          const leaseProperty = (r.building_address || r.property_address) + (r.unit_number ? ', Unit ' + r.unit_number : '');
          const { data: existingLeaseArr } = await supabase.from('leases').select('id').eq('user_id', user.id).eq('tenant_name', r.tenant_name);
          const existingLease = existingLeaseArr?.[0] || null;
          if (!existingLease) {
            const validDate = (d: string) => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
            const { error: leaseError } = await supabase.from('leases').insert({
              user_id: user.id, tenant_name: r.tenant_name, property: leaseProperty,
              rent: parseFloat(r.monthly_rent) || 0, deposit: parseFloat(r.deposit) || 0,
              start_date: validDate(r.lease_start), end_date: validDate(r.lease_end),
              email: '', phone: '', status: 'active',
              payment_day: parseInt(r.payment_day) || 1, payment_frequency: r.payment_frequency || 'monthly',
              late_fee_percent: parseFloat(r.late_fee_percent) || 5, late_fee_days: parseInt(r.late_fee_days) || 3,
              late_fee_type: r.late_fee_type || 'percent', lease_terms_raw: r.late_fee_clause || '',
            });
            if (leaseError) {
              log.push('✗ Could not create lease: ' + leaseError.message);
            } else {
              log.push('✓ Created lease: ' + r.tenant_name);

              // Generate payment schedule from today forward
              const { data: newLeaseArr } = await supabase.from('leases').select('*').eq('user_id', user.id).eq('tenant_name', r.tenant_name);
              const newLease = newLeaseArr?.[0] || null;
              if (newLease?.end_date && newLease.rent) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const payDay = newLease.payment_day || 1;
                const endDate = new Date(newLease.end_date);

                let current = new Date(today.getFullYear(), today.getMonth(), payDay);
                if (current < today) current = new Date(today.getFullYear(), today.getMonth() + 1, payDay);

                let paymentCount = 0;
                while (current <= endDate) {
                  await supabase.from('payments').insert({
                    user_id: user.id,
                    lease_id: newLease.id,
                    tenant_name: newLease.tenant_name,
                    property: newLease.property,
                    amount: newLease.rent,
                    due_date: current.toISOString().split('T')[0],
                    status: 'pending',
                  });
                  current = new Date(current.getFullYear(), current.getMonth() + 1, payDay);
                  paymentCount++;
                }

                if (paymentCount > 0) {
                  log.push('✓ Created ' + paymentCount + ' payment' + (paymentCount !== 1 ? 's' : '') + ' from today forward');
                }
              }
            }
          }
        }

        if ((r.document_type === 'repair_receipt' || r.document_type === 'improvement') && r.amount) {
          await supabase.from('expenses').insert({
            user_id: user.id, property: r.property_address || '',
            category: r.expense_category || 'Repairs',
            amount: +r.amount,
            date: r.document_date || new Date().toISOString().split('T')[0],
            description: r.summary?.slice(0, 80) || fileStatus.file.name,
            deductible: true,
          });
          log.push('✓ Created expense: $' + r.amount + (r.vendor ? ' — ' + r.vendor : ''));
        }

        const ownership = r.tenant_name ? 'tenant' : r.property_address ? 'property' : 'portfolio';
        await supabase.from('documents').insert({
          user_id: user.id,
          name: r.tenant_name
            ? r.tenant_name + ' — ' + (DOC_TYPE_LABELS[r.document_type]?.label || 'Document')
            : fileStatus.file.name.replace(/\.[^/.]+$/, ''),
          type: r.document_type || 'other',
          ownership_level: ownership,
          property: r.property_address || '',
          tenant_name: r.tenant_name || '',
          file_path: filePath, file_url: '',
          summary: r.summary || '',
          expiry_date: r.expiry_date || null,
          size: (fileStatus.file.size / 1024).toFixed(0) + ' KB',
        });
        log.push('✓ Stored: ' + fileStatus.file.name);
      } catch {
        log.push('✗ Error: ' + fileStatus.file.name);
      }
      setImportLog([...log]);
    }

    setImporting(false);
    setStep(4);
    setImportLog(log);
    getAiWelcome();
  };

  const totalCreated = {
    leases: files.filter(f => f.result?.document_type === 'lease' && f.result?.tenant_name).length,
    docs: files.filter(f => f.status === 'done').length,
    expenses: files.filter(f => ['repair_receipt', 'improvement'].includes(f.result?.document_type) && f.result?.amount).length,
  };

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ width: '100%', maxWidth: 660 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <KeywiseLogo size={36} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.navy, letterSpacing: '-0.3px' }}>Keywise</div>
              <div style={{ fontSize: 9, color: T.teal, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Property AI</div>
            </div>
          </div>
        </div>

        {step < 4 && <ProgressBar step={step} skipProfile={profileComplete} />}

        {/* STEP 0 — Welcome */}
        {step === 0 && (
          <div style={{ background: T.surface, borderRadius: 20, padding: 48, textAlign: 'center', boxShadow: T.shadowMd, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.navy, marginBottom: 12, letterSpacing: '-0.4px' }}>
              {profileComplete
                ? <>Import more documents<br />to your portfolio</>
                : <>Property management,<br />made intelligent.</>
              }
            </div>
            <div style={{ fontSize: 14, color: T.inkMuted, marginBottom: 32, lineHeight: 1.7, maxWidth: 440, margin: '0 auto 32px' }}>
              {profileComplete
                ? 'Upload lease PDFs, insurance docs, or receipts — Keywise will extract the data and organize everything automatically.'
                : 'Keywise uses AI to handle the time-consuming parts of being a landlord — so you can focus on what matters.'
              }
            </div>

            {!profileComplete && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 40, textAlign: 'left' }}>
                {[
                  { icon: '📄', title: 'Smart lease tracking', desc: 'Upload a PDF — we extract every term including late fee clauses' },
                  { icon: '💳', title: 'Rent on autopilot', desc: 'Payment schedules aligned to your actual contract terms' },
                  { icon: '✦', title: 'AI-powered drafts', desc: 'Notices, reminders, and renewals written in seconds' },
                ].map(item => (
                  <div key={item.title} style={{ background: T.bg, borderRadius: T.radius, padding: 18, border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{item.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: T.navy, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setStep(profileComplete ? 2 : 1)}
              style={{ ...btn.primary, padding: '13px 40px', fontSize: 15, borderRadius: 12 }}>
              {profileComplete ? 'Import Documents →' : 'Get Started →'}
            </button>
            <div style={{ marginTop: 14 }}>
              <button onClick={onComplete}
                style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer' }}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* STEP 1 — Profile */}
        {step === 1 && (
          <div style={{ background: T.surface, borderRadius: 20, padding: 40, boxShadow: T.shadowMd, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, marginBottom: 6, letterSpacing: '-0.3px' }}>
              Your landlord profile
            </div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 28, lineHeight: 1.6 }}>
              This automatically fills in every letter, notice, and email Keywise drafts for you. Takes 30 seconds.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {[
                { label: 'Your Full Name *', key: 'full_name', placeholder: 'John Smith', type: 'text' },
                { label: 'Email Address', key: 'email', placeholder: 'john@email.com', type: 'email' },
                { label: 'Phone Number', key: 'phone', placeholder: '(949) 555-0100', type: 'tel' },
                { label: 'Company / DBA', key: 'company', placeholder: 'Smith Properties LLC', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label style={label}>{f.label}</label>
                  <input type={f.type} style={input} placeholder={f.placeholder}
                    value={profile[f.key as keyof typeof profile]}
                    onChange={e => setProfile({ ...profile, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={label}>Mailing Address</label>
              <input type="text" style={input} placeholder="123 Main St, Dana Point, CA 92629"
                value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} />
            </div>

            <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: 12, marginBottom: 24, fontSize: 13, color: T.tealDark }}>
              ✦ Your name and contact info will appear in every AI-drafted letter as the sender.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveProfile} disabled={savingProfile || !profile.full_name}
                style={{ ...btn.primary, flex: 1, justifyContent: 'center', padding: '12px', fontSize: 14, borderRadius: 10, opacity: !profile.full_name ? 0.5 : 1 }}>
                {savingProfile ? 'Saving…' : 'Save & Continue →'}
              </button>
              <button onClick={() => setStep(2)} style={{ ...btn.ghost }}>Skip</button>
            </div>
          </div>
        )}

        {/* STEP 2 — Upload */}
        {step === 2 && (
          <div style={{ background: T.surface, borderRadius: 20, padding: 40, boxShadow: T.shadowMd, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, marginBottom: 6, letterSpacing: '-0.3px' }}>
              Import your documents
            </div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 8, lineHeight: 1.6 }}>
              Drop everything you have — leases, insurance certs, receipts, inspection reports. Claude reads each file and sets up your portfolio automatically.
            </div>

            {/* What gets extracted */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              {[
                { icon: '📄', label: 'Leases → tenant + property + payment schedule' },
                { icon: '🛡️', label: 'Insurance → stored + expiry tracked' },
                { icon: '🧾', label: 'Receipts → expense entries created' },
              ].map(item => (
                <div key={item.label} style={{ background: T.bg, borderRadius: T.radiusSm, padding: '6px 12px', fontSize: 12, color: T.inkMid, border: `1px solid ${T.border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span>{item.icon}</span> {item.label}
                </div>
              ))}
            </div>

            {/* Drop zone */}
            <div
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed ' + (dragOver ? T.navy : T.border),
                borderRadius: T.radius, padding: '36px 24px', textAlign: 'center',
                cursor: 'pointer', marginBottom: 20,
                background: dragOver ? T.tealLight : T.bg,
                transition: 'all 0.15s',
              }}>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                onChange={e => { if (e.target.files) addFiles(e.target.files); }} />
              <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 4 }}>Drop all your documents here</div>
              <div style={{ fontSize: 13, color: T.inkMuted }}>PDFs and images · leases, insurance, receipts, anything</div>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  {files.length} file{files.length !== 1 ? 's' : ''} ready
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.bg, borderRadius: T.radiusSm, padding: '8px 12px', border: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 16 }}>
                        {f.status === 'processing' ? <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙️</span> : '📄'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{f.file.name}</div>
                        {f.status === 'processing' && f.error && (
                          <div style={{ fontSize: 11, color: T.tealDark, marginTop: 2 }}>{f.error}</div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: T.inkMuted }}>{(f.file.size / 1024).toFixed(0)} KB</div>
                      {f.status === 'pending' && (
                        <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', color: T.inkMuted, cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {processing && (
              <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: T.tealDark, display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙️</span>
                <span>Processing {processProgress.current} of {processProgress.total} file{processProgress.total !== 1 ? 's' : ''}…</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={processAll} disabled={processing}
                style={{
                  ...btn.primary, flex: 1, justifyContent: 'center', padding: '12px', fontSize: 14, borderRadius: 10,
                  opacity: processing ? 0.7 : 1,
                }}>
                {processing
                  ? '✦ Reading documents…'
                  : files.length > 0
                    ? '✦ Process ' + files.length + ' Document' + (files.length !== 1 ? 's' : '') + ' →'
                    : 'Continue without documents →'
                }
              </button>
              {files.length === 0 && (
                <button onClick={onComplete} style={{ ...btn.ghost }}>Skip</button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3 — Review */}
        {step === 3 && (
          <div style={{ background: T.surface, borderRadius: 20, padding: 40, boxShadow: T.shadowMd, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, marginBottom: 4, letterSpacing: '-0.3px' }}>
              Review what Claude found
            </div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 24 }}>
              Here's what will be imported. Review and confirm.
            </div>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { icon: '📄', label: 'Leases', value: totalCreated.leases, color: T.navy },
                { icon: '📁', label: 'Documents', value: totalCreated.docs, color: T.tealDark },
                { icon: '💰', label: 'Expenses', value: totalCreated.expenses, color: T.greenDark },
              ].map(stat => (
                <div key={stat.label} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* File results */}
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {files.map((f, i) => {
                const dt = f.result ? DOC_TYPE_LABELS[f.result.document_type] : null;
                return (
                  <div key={i} style={{
                    border: `1px solid ${f.status === 'error' ? T.coral + '44' : T.border}`,
                    borderRadius: T.radiusSm, padding: 14,
                    background: f.status === 'error' ? T.coralLight : T.bg,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{f.status === 'done' ? '✅' : f.status === 'error' ? '❌' : '⏳'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: T.ink, marginBottom: 4 }}>{f.file.name}</div>
                        {dt && (
                          <span style={{ background: T.tealLight, color: T.tealDark, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, marginBottom: 6, display: 'inline-block' }}>
                            {dt.icon} {dt.label}
                          </span>
                        )}
                        {f.result?.summary && (
                          <div style={{ fontSize: 12, color: T.inkMid, marginTop: 6, lineHeight: 1.5 }}>
                            {f.result.summary}
                          </div>
                        )}
                        {f.actions && f.actions.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {f.actions.map((action, j) => (
                              <div key={j} style={{ fontSize: 12, color: T.tealDark, display: 'flex', gap: 6 }}>
                                <span>→</span> {action}
                              </div>
                            ))}
                          </div>
                        )}
                        {f.status === 'error' && (
                          <div style={{ fontSize: 12, color: T.coral, marginTop: 4 }}>Could not read this file — it will be skipped.</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {files.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: T.inkMuted, fontSize: 13 }}>
                  No documents were uploaded. You can add them later from the Operations page.
                </div>
              )}
            </div>

            {importLog.length > 0 && (
              <div style={{ background: T.tealLight, borderRadius: T.radiusSm, padding: 14, marginBottom: 20, maxHeight: 140, overflowY: 'auto' }}>
                {importLog.map((log, i) => (
                  <div key={i} style={{ fontSize: 12, color: log.startsWith('✗') ? T.coral : T.tealDark, marginBottom: 3 }}>{log}</div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={importAll} disabled={importing}
                style={{ ...btn.primary, flex: 1, justifyContent: 'center', padding: '12px', fontSize: 14, borderRadius: 10, opacity: importing ? 0.7 : 1 }}>
                {importing ? '✦ Importing…' : files.filter(f => f.status === 'done').length > 0 ? '✦ Import Everything →' : 'Continue →'}
              </button>
              <button onClick={onComplete} style={{ ...btn.ghost }}>Skip</button>
            </div>
          </div>
        )}

        {/* STEP 4 — Done */}
        {step === 4 && (
          <div style={{ background: T.surface, borderRadius: 20, padding: 48, textAlign: 'center', boxShadow: T.shadowMd, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.navy, marginBottom: 8, letterSpacing: '-0.4px' }}>
              You're all set{profile.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}!
            </div>

            {/* AI welcome message */}
            <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: 18, marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
              {loadingWelcome ? (
                <div style={{ fontSize: 13, color: T.tealDark, animation: 'pulse 1.5s ease-in-out infinite' }}>
                  ✦ Preparing your personalized welcome…
                </div>
              ) : aiWelcome ? (
                <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.7, fontStyle: 'italic' }}>
                  "{aiWelcome}"
                </div>
              ) : (
                <div style={{ fontSize: 13, color: T.tealDark }}>
                  ✦ Your Keywise portfolio is ready. Head to your dashboard to get started.
                </div>
              )}
            </div>

            {/* Import summary */}
            {importLog.length > 0 && (
              <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 16, marginBottom: 24, textAlign: 'left', maxHeight: 160, overflowY: 'auto', maxWidth: 480, margin: '0 auto 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Import Summary</div>
                {importLog.map((log, i) => (
                  <div key={i} style={{ fontSize: 12, color: log.startsWith('✗') ? T.coral : T.greenDark, marginBottom: 3 }}>{log}</div>
                ))}
              </div>
            )}

            {/* What's next */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
              {[
                { icon: '⊞', label: 'View Dashboard', desc: 'See your portfolio overview' },
                { icon: '💳', label: 'Set Up Payments', desc: 'Generate recurring schedules' },
                { icon: '✦', label: 'Draft a Message', desc: 'Send your first AI letter' },
              ].map(item => (
                <div key={item.label} style={{ background: T.bg, borderRadius: T.radiusSm, padding: 14, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: T.navy }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <button onClick={onComplete}
              style={{ ...btn.primary, padding: '13px 48px', fontSize: 15, borderRadius: 12 }}>
              Go to Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}