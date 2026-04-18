'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T, card, btn, label as labelStyle, input as inputStyle } from '../lib/theme';

type Sensor = {
  id: string;
  user_id: string;
  property_id: string | null;
  property_address: string;
  name: string;
  sensor_type: string;
  location: string;
  unit: string;
  status: string;
  threshold_warning: number | null;
  threshold_critical: number | null;
  created_at: string;
};

type SensorReading = {
  id: string;
  sensor_id: string;
  value: number;
  unit: string;
  recorded_at: string;
};

type PreventiveAlert = {
  id: string;
  sensor_name: string;
  severity: string;
  title: string;
  description: string;
  recommended_action: string;
  estimated_cost: string;
  timeframe: string;
  status: string;
  created_at: string;
};

type Analysis = {
  overall_health: number;
  alerts: { severity: string; sensor_name: string; title: string; description: string; recommended_action: string; estimated_cost: string; timeframe: string }[];
  predictions: { title: string; likelihood: string; timeframe: string; sensor: string; reasoning: string; preventive_action: string }[];
  sensor_health: { sensor_name: string; status: string; summary: string }[];
  seasonal_tips: string[];
};

const SENSOR_TYPES = [
  { id: 'temperature', label: 'Temperature', unit: '°F', icon: '🌡️' },
  { id: 'humidity', label: 'Humidity', unit: '%', icon: '💧' },
  { id: 'water_leak', label: 'Water Leak', unit: 'detected', icon: '🚰' },
  { id: 'smoke', label: 'Smoke/CO', unit: 'ppm', icon: '🔥' },
  { id: 'hvac', label: 'HVAC Performance', unit: '°F', icon: '❄️' },
  { id: 'electrical', label: 'Electrical Load', unit: 'kWh', icon: '⚡' },
  { id: 'vibration', label: 'Vibration', unit: 'mm/s', icon: '📳' },
  { id: 'pressure', label: 'Water Pressure', unit: 'PSI', icon: '🔧' },
];

const severityConfig: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  critical: { bg: T.coralLight, border: T.coral, text: '#CC0000', badge: T.coral },
  warning: { bg: T.amberLight, border: T.amber, text: T.amberDark, badge: T.amber },
  info: { bg: T.tealLight, border: T.teal, text: T.tealDark, badge: T.teal },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  normal: { bg: T.greenLight, text: T.greenDark },
  warning: { bg: T.amberLight, text: T.amberDark },
  critical: { bg: T.coralLight, text: T.coral },
  offline: { bg: T.bg, text: T.inkMuted },
  online: { bg: T.greenLight, text: T.greenDark },
};

export default function PreventiveMaintenance() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [readings, setReadings] = useState<Record<string, SensorReading[]>>({});
  const [alerts, setAlerts] = useState<PreventiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSensor, setShowAddSensor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [properties, setProperties] = useState<{ id: string; address: string }[]>([]);
  const [error, setError] = useState('');
  const [showSimulate, setShowSimulate] = useState<string | null>(null);
  const [simValue, setSimValue] = useState('');
  const [view, setView] = useState<'dashboard' | 'sensors' | 'alerts'>('dashboard');

  const emptyForm = {
    name: '', sensor_type: 'temperature', location: '', property_id: '',
    property_address: '', unit: '°F', threshold_warning: '', threshold_critical: '',
  };
  const [form, setForm] = useState<any>(emptyForm);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [sRes, aRes, pRes] = await Promise.all([
      supabase.from('iot_sensors').select('*').order('created_at', { ascending: false }),
      supabase.from('preventive_alerts').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('properties').select('id, address'),
    ]);
    if (sRes.data) {
      setSensors(sRes.data);
      // Fetch recent readings for all sensors
      if (sRes.data.length > 0) {
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const { data: rData } = await supabase
          .from('sensor_readings')
          .select('*')
          .in('sensor_id', sRes.data.map(s => s.id))
          .gte('recorded_at', cutoff)
          .order('recorded_at', { ascending: false });
        if (rData) {
          const grouped: Record<string, SensorReading[]> = {};
          rData.forEach(r => {
            if (!grouped[r.sensor_id]) grouped[r.sensor_id] = [];
            grouped[r.sensor_id].push(r);
          });
          setReadings(grouped);
        }
      }
    }
    if (aRes.data) setAlerts(aRes.data);
    if (pRes.data) setProperties(pRes.data);
    setLoading(false);

    // Load cached analysis
    const cached = sessionStorage.getItem('kw_preventive_analysis');
    if (cached) { try { setAnalysis(JSON.parse(cached)); } catch {} }
  };

  const addSensor = async () => {
    if (!form.name || !form.sensor_type) { setError('Name and type are required.'); return; }
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const selectedProp = properties.find(p => p.id === form.property_id);
    const { error: insertError } = await supabase.from('iot_sensors').insert({
      user_id: user.id,
      name: form.name,
      sensor_type: form.sensor_type,
      location: form.location,
      property_id: form.property_id || null,
      property_address: selectedProp?.address || form.property_address || '',
      unit: form.unit,
      status: 'online',
      threshold_warning: form.threshold_warning ? +form.threshold_warning : null,
      threshold_critical: form.threshold_critical ? +form.threshold_critical : null,
    });

    if (insertError) {
      setError('Failed to add sensor: ' + insertError.message);
    } else {
      setShowAddSensor(false);
      setForm(emptyForm);
      await fetchAll();
    }
    setSaving(false);
  };

  const removeSensor = async (id: string) => {
    if (!confirm('Remove this sensor and its readings?')) return;
    await supabase.from('sensor_readings').delete().eq('sensor_id', id);
    await supabase.from('iot_sensors').delete().eq('id', id);
    setSensors(sensors.filter(s => s.id !== id));
  };

  const toggleSensorStatus = async (sensor: Sensor) => {
    const newStatus = sensor.status === 'online' ? 'offline' : 'online';
    await supabase.from('iot_sensors').update({ status: newStatus }).eq('id', sensor.id);
    setSensors(sensors.map(s => s.id === sensor.id ? { ...s, status: newStatus } : s));
  };

  const simulateReading = async (sensorId: string) => {
    if (!simValue) return;
    const sensor = sensors.find(s => s.id === sensorId);
    await supabase.from('sensor_readings').insert({
      sensor_id: sensorId,
      value: +simValue,
      unit: sensor?.unit || '',
      recorded_at: new Date().toISOString(),
    });
    setShowSimulate(null);
    setSimValue('');
    await fetchAll();
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAnalyzing(false); return; }

    try {
      const res = await fetch('/api/preventive-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.message || 'Analysis failed.');
      } else if (data.result) {
        setAnalysis(data.result);
        sessionStorage.setItem('kw_preventive_analysis', JSON.stringify(data.result));
        // Refresh alerts after analysis
        const { data: aRes } = await supabase.from('preventive_alerts').select('*').order('created_at', { ascending: false }).limit(50);
        if (aRes) setAlerts(aRes);
      }
    } catch {
      setError('Failed to run analysis. Please try again.');
    }
    setAnalyzing(false);
  };

  const dismissAlert = async (id: string) => {
    await supabase.from('preventive_alerts').update({ status: 'dismissed' }).eq('id', id);
    setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'dismissed' } : a));
  };

  const resolveAlert = async (id: string) => {
    await supabase.from('preventive_alerts').update({ status: 'resolved' }).eq('id', id);
    setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
  };

  const onlineSensors = sensors.filter(s => s.status === 'online').length;
  const activeCritical = alerts.filter(a => a.severity === 'critical' && a.status === 'active').length;
  const activeWarning = alerts.filter(a => a.severity === 'warning' && a.status === 'active').length;
  const activeAlerts = alerts.filter(a => a.status === 'active');

  const getSensorIcon = (type: string) => SENSOR_TYPES.find(t => t.id === type)?.icon || '📡';

  const getLatestReading = (sensorId: string) => {
    const sensorReadings = readings[sensorId];
    return sensorReadings?.[0] ?? null;
  };

  const getSensorStatus = (sensor: Sensor): 'normal' | 'warning' | 'critical' | 'offline' => {
    if (sensor.status === 'offline') return 'offline';
    const latest = getLatestReading(sensor.id);
    if (!latest) return 'normal';
    if (sensor.threshold_critical && latest.value >= sensor.threshold_critical) return 'critical';
    if (sensor.threshold_warning && latest.value >= sensor.threshold_warning) return 'warning';
    return 'normal';
  };

  // ── Loading skeleton ──
  if (loading) return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ ...card, height: 90 }}>
            <div style={{ height: 12, width: '60%', background: T.border, borderRadius: 6, marginBottom: 12 }} />
            <div style={{ height: 28, width: '40%', background: T.border, borderRadius: 6 }} />
          </div>
        ))}
      </div>
      <div style={{ ...card, height: 200 }}>
        <div style={{ height: 14, width: '30%', background: T.border, borderRadius: 6, marginBottom: 16 }} />
        <div style={{ height: 10, width: '100%', background: T.border, borderRadius: 6, marginBottom: 10 }} />
        <div style={{ height: 10, width: '80%', background: T.border, borderRadius: 6 }} />
      </div>
    </div>
  );

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div style={{ background: T.coralLight, border: `1px solid ${T.coral}33`, borderRadius: T.radiusSm, padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: T.coral, fontWeight: 600 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: T.coral, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* ── AI Analysis Hero ── */}
      {sensors.length > 0 && (
        <div style={{ background: T.navy, borderRadius: T.radiusLg, padding: isMobile ? 16 : 22, marginBottom: 20, color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAnalysis ? 16 : 0, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>✦</span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>AI Preventive Maintenance</span>
              <span style={{ background: T.teal, color: T.navy, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>IoT</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={runAnalysis} disabled={analyzing}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: analyzing ? 0.7 : 1 }}>
                {analyzing ? 'Analyzing sensors…' : analysis ? '↻ Re-analyze' : 'Run AI Analysis'}
              </button>
              <button onClick={() => setShowAnalysis(!showAnalysis)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.6)', padding: '5px 8px', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                {showAnalysis ? '▲' : '▼'}
              </button>
            </div>
          </div>

          {showAnalysis && analysis && (
            <div>
              {/* Health + Alert Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: T.radiusSm, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: (analysis.overall_health ?? 0) >= 80 ? T.teal : (analysis.overall_health ?? 0) >= 60 ? T.amber : T.coral }}>
                    {analysis.overall_health ?? '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Health Score</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: T.radiusSm, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{onlineSensors}/{sensors.length}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Sensors Online</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: T.radiusSm, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: activeCritical > 0 ? T.coral : T.teal }}>{activeCritical}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Critical Alerts</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: T.radiusSm, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: activeWarning > 0 ? T.amber : T.teal }}>{activeWarning}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Warnings</div>
                </div>
              </div>

              {/* Alerts from AI */}
              {(analysis.alerts || []).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Active Alerts</div>
                  {analysis.alerts.map((a, i) => {
                    const c = severityConfig[a.severity] || severityConfig.info;
                    return (
                      <div key={i} style={{ background: c.bg, borderLeft: `3px solid ${c.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: T.navy }}>{a.title}</div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: c.badge + '22', color: c.text, textTransform: 'uppercase' }}>{a.severity}</span>
                            <span style={{ fontSize: 10, color: T.inkMuted }}>{a.timeframe}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: T.inkMid, marginBottom: 4 }}>{a.description}</div>
                        <div style={{ fontSize: 12, color: T.tealDark, fontWeight: 600 }}>→ {a.recommended_action}</div>
                        {a.estimated_cost && <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>Est. cost: {a.estimated_cost}</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Predictions */}
              {(analysis.predictions || []).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Predictions</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                    {analysis.predictions.map((p, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{p.title}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                            background: p.likelihood === 'high' ? '#FF6B6B33' : p.likelihood === 'medium' ? '#FFB34733' : '#00D4AA33',
                            color: p.likelihood === 'high' ? '#FF6B6B' : p.likelihood === 'medium' ? '#FFB347' : T.teal }}>
                            {p.likelihood}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{p.timeframe}{p.sensor ? ` · ${p.sensor}` : ''}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{p.reasoning}</div>
                        <div style={{ fontSize: 12, color: T.teal, fontWeight: 600 }}>→ {p.preventive_action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seasonal Tips */}
              {(analysis.seasonal_tips || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Seasonal Tips</div>
                  {analysis.seasonal_tips.map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ color: T.teal, fontWeight: 700, flexShrink: 0 }}>•</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showAnalysis && !analysis && !analyzing && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                Run AI analysis to get preventive maintenance insights from your IoT sensor data.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Sensors', value: sensors.length, color: T.navy },
          { label: 'Online', value: onlineSensors, color: T.greenDark },
          { label: 'Critical Alerts', value: activeCritical, color: activeCritical > 0 ? T.coral : T.greenDark },
          { label: 'Warnings', value: activeWarning, color: activeWarning > 0 ? T.amberDark : T.greenDark },
        ].map(stat => (
          <div key={stat.label} style={{ ...card }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* View tabs + Add button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {([
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'sensors', label: `Sensors (${sensors.length})` },
            { id: 'alerts', label: `Alerts (${activeAlerts.length})` },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setView(t.id)}
              style={{
                padding: '6px 14px', borderRadius: T.radiusSm, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: view === t.id ? T.navy : T.bg,
                color: view === t.id ? '#fff' : T.inkMid,
                border: `1px solid ${view === t.id ? T.navy : T.border}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowAddSensor(true); setForm(emptyForm); setError(''); }}
          style={{ ...btn.primary }}>
          + Add Sensor
        </button>
      </div>

      {/* ── DASHBOARD VIEW ── */}
      {view === 'dashboard' && (
        <>
          {sensors.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: T.navy }}>No IoT sensors connected</div>
              <div style={{ color: T.inkMuted, fontSize: 13, marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
                Connect temperature, humidity, water leak, and HVAC sensors to get AI-powered preventive maintenance alerts before issues become costly repairs.
              </div>
              <button onClick={() => setShowAddSensor(true)} style={{ ...btn.primary }}>+ Add First Sensor</button>
            </div>
          ) : (
            <div>
              {/* Sensor grid */}
              <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Sensor Status</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
                {sensors.map(sensor => {
                  const latest = getLatestReading(sensor.id);
                  const status = getSensorStatus(sensor);
                  const sc = statusColors[status] || statusColors.normal;
                  const aiHealth = analysis?.sensor_health?.find(h => h.sensor_name === sensor.name);

                  return (
                    <div key={sensor.id} style={{ ...card, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 44, height: 44, borderRadius: T.radiusSm, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                        {getSensorIcon(sensor.sensor_type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>{sensor.name}</div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.text, textTransform: 'uppercase' }}>
                            {status}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 4 }}>
                          {sensor.location}{sensor.property_address ? ` · ${sensor.property_address.split(',')[0]}` : ''}
                        </div>
                        {latest ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontSize: 22, fontWeight: 700, color: status === 'critical' ? T.coral : status === 'warning' ? T.amberDark : T.navy }}>
                              {latest.value}
                            </span>
                            <span style={{ fontSize: 12, color: T.inkMuted }}>{latest.unit || sensor.unit}</span>
                            <span style={{ fontSize: 10, color: T.inkMuted, marginLeft: 'auto' }}>
                              {new Date(latest.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: T.inkMuted, fontStyle: 'italic' }}>No readings yet</div>
                        )}
                        {aiHealth && (
                          <div style={{ fontSize: 11, color: T.tealDark, marginTop: 4, fontWeight: 600 }}>✦ {aiHealth.summary}</div>
                        )}

                        {/* Mini sparkline using last readings */}
                        {readings[sensor.id] && readings[sensor.id].length > 1 && (
                          <div style={{ display: 'flex', gap: 2, alignItems: 'end', height: 24, marginTop: 8 }}>
                            {(() => {
                              const vals = readings[sensor.id].slice(0, 20).reverse().map(r => r.value);
                              const min = Math.min(...vals);
                              const max = Math.max(...vals);
                              const range = max - min || 1;
                              return vals.map((v, i) => (
                                <div key={i} style={{
                                  flex: 1, maxWidth: 8,
                                  height: Math.max(3, ((v - min) / range) * 22),
                                  background: v >= (sensor.threshold_critical || Infinity) ? T.coral :
                                    v >= (sensor.threshold_warning || Infinity) ? T.amber : T.teal,
                                  borderRadius: 2,
                                }} />
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recent alerts */}
              {activeAlerts.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Recent Alerts</div>
                  {activeAlerts.slice(0, 5).map(alert => {
                    const c = severityConfig[alert.severity] || severityConfig.info;
                    return (
                      <div key={alert.id} style={{ ...card, borderLeft: `3px solid ${c.border}`, marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>{alert.title}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: c.badge + '22', color: c.text, textTransform: 'uppercase' }}>{alert.severity}</span>
                              {alert.sensor_name && <span style={{ fontSize: 11, color: T.inkMuted }}>· {alert.sensor_name}</span>}
                            </div>
                            <div style={{ fontSize: 12, color: T.inkMid, marginBottom: 4 }}>{alert.description}</div>
                            <div style={{ fontSize: 12, color: T.tealDark, fontWeight: 600 }}>→ {alert.recommended_action}</div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                              {alert.estimated_cost && <span style={{ fontSize: 11, color: T.inkMuted }}>Est: {alert.estimated_cost}</span>}
                              {alert.timeframe && <span style={{ fontSize: 11, color: T.inkMuted }}>{alert.timeframe}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button onClick={() => resolveAlert(alert.id)} style={{ ...btn.teal, padding: '5px 10px', fontSize: 11 }}>Resolve</button>
                            <button onClick={() => dismissAlert(alert.id)} style={{ ...btn.ghost, padding: '5px 10px', fontSize: 11 }}>Dismiss</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── SENSORS VIEW ── */}
      {view === 'sensors' && (
        <div>
          {sensors.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 13, color: T.inkMuted }}>No sensors added yet.</div>
            </div>
          ) : sensors.map(sensor => {
            const latest = getLatestReading(sensor.id);
            const status = getSensorStatus(sensor);
            const sc = statusColors[status] || statusColors.normal;
            const sensorReadings = readings[sensor.id] || [];

            return (
              <div key={sensor.id} style={{ ...card, marginBottom: 12 }}>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18 }}>{getSensorIcon(sensor.sensor_type)}</span>
                      <span style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>{sensor.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.text, textTransform: 'uppercase' }}>{status}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: T.bg, color: T.inkMuted }}>{sensor.sensor_type}</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 6 }}>
                      {sensor.location}{sensor.property_address ? ` · ${sensor.property_address}` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
                      <span style={{ color: T.inkMid }}>Unit: {sensor.unit}</span>
                      {sensor.threshold_warning && <span style={{ color: T.amberDark }}>⚠ Warning: {sensor.threshold_warning}{sensor.unit}</span>}
                      {sensor.threshold_critical && <span style={{ color: T.coral }}>⛔ Critical: {sensor.threshold_critical}{sensor.unit}</span>}
                    </div>
                    {latest && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontSize: 22, fontWeight: 700, color: T.navy }}>{latest.value}</span>
                        <span style={{ fontSize: 12, color: T.inkMuted, marginLeft: 4 }}>{latest.unit || sensor.unit}</span>
                        <span style={{ fontSize: 11, color: T.inkMuted, marginLeft: 12 }}>
                          Last: {new Date(latest.recorded_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {/* Reading history */}
                    {sensorReadings.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>Recent Readings</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {sensorReadings.slice(0, 10).map((r, i) => (
                            <div key={i} style={{ background: T.bg, borderRadius: 6, padding: '4px 8px', fontSize: 11, color: T.inkMid }}>
                              {r.value}{r.unit || sensor.unit} <span style={{ color: T.inkMuted }}>{new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => toggleSensorStatus(sensor)}
                      style={{ ...btn.ghost, padding: '6px 12px', fontSize: 11 }}>
                      {sensor.status === 'online' ? '⏸ Pause' : '▶ Resume'}
                    </button>
                    <button onClick={() => { setShowSimulate(sensor.id); setSimValue(''); }}
                      style={{ ...btn.teal, padding: '6px 12px', fontSize: 11 }}>
                      📊 Log Reading
                    </button>
                    <button onClick={() => removeSensor(sensor.id)}
                      style={{ ...btn.danger, padding: '6px 12px', fontSize: 11 }}>
                      Remove
                    </button>
                  </div>
                </div>

                {/* Simulate reading inline */}
                {showSimulate === sensor.id && (
                  <div style={{ marginTop: 12, padding: 12, background: T.bg, borderRadius: T.radiusSm, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.navy }}>Log reading:</span>
                    <input
                      type="number"
                      value={simValue}
                      onChange={e => setSimValue(e.target.value)}
                      placeholder={`Value (${sensor.unit})`}
                      style={{ ...inputStyle, width: 120, padding: '6px 10px', fontSize: 12 }}
                    />
                    <button onClick={() => simulateReading(sensor.id)}
                      style={{ ...btn.primary, padding: '6px 14px', fontSize: 11 }}>
                      Save
                    </button>
                    <button onClick={() => setShowSimulate(null)}
                      style={{ ...btn.ghost, padding: '6px 14px', fontSize: 11 }}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── ALERTS VIEW ── */}
      {view === 'alerts' && (
        <div>
          {alerts.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 6 }}>No alerts</div>
              <div style={{ fontSize: 13, color: T.inkMuted }}>Run an AI analysis to check your sensors for potential issues.</div>
            </div>
          ) : (
            <>
              {/* Filter by status */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['all', 'active', 'resolved', 'dismissed'].map(f => {
                  const count = f === 'all' ? alerts.length : alerts.filter(a => a.status === f).length;
                  return (
                    <button key={f} style={{
                      padding: '5px 12px', borderRadius: T.radiusSm, fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                      background: T.bg, color: T.inkMid, border: `1px solid ${T.border}`,
                    }}>
                      {f} ({count})
                    </button>
                  );
                })}
              </div>

              {alerts.map(alert => {
                const c = severityConfig[alert.severity] || severityConfig.info;
                const isActive = alert.status === 'active';
                return (
                  <div key={alert.id} style={{ ...card, borderLeft: `3px solid ${isActive ? c.border : T.border}`, marginBottom: 10, opacity: isActive ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>{alert.title}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: c.badge + '22', color: c.text, textTransform: 'uppercase' }}>{alert.severity}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: isActive ? T.amberLight : T.greenLight, color: isActive ? T.amberDark : T.greenDark, textTransform: 'uppercase' }}>{alert.status}</span>
                        </div>
                        {alert.sensor_name && <div style={{ fontSize: 11, color: T.inkMuted, marginBottom: 4 }}>Sensor: {alert.sensor_name}</div>}
                        <div style={{ fontSize: 12, color: T.inkMid, marginBottom: 4 }}>{alert.description}</div>
                        <div style={{ fontSize: 12, color: T.tealDark, fontWeight: 600 }}>→ {alert.recommended_action}</div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: T.inkMuted }}>
                          {alert.estimated_cost && <span>Est: {alert.estimated_cost}</span>}
                          {alert.timeframe && <span>{alert.timeframe}</span>}
                          <span>{new Date(alert.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {isActive && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => resolveAlert(alert.id)} style={{ ...btn.teal, padding: '5px 10px', fontSize: 11 }}>Resolve</button>
                          <button onClick={() => dismissAlert(alert.id)} style={{ ...btn.ghost, padding: '5px 10px', fontSize: 11 }}>Dismiss</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── ADD SENSOR MODAL ── */}
      {showAddSensor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,52,96,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => { setShowAddSensor(false); setError(''); }}>
          <div style={{ background: T.surface, borderRadius: 16, padding: isMobile ? 24 : 32, width: isMobile ? '92%' : 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(15,52,96,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>Add IoT Sensor</div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 20 }}>Connect a sensor to monitor property conditions and get AI-powered preventive alerts.</div>

            {error && (
              <div style={{ background: T.coralLight, borderRadius: T.radiusSm, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: T.coral, fontWeight: 600 }}>{error}</div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Sensor Name *</label>
              <input style={inputStyle} value={form.name} placeholder="e.g. Unit 1A Thermostat"
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Sensor Type *</label>
                <select style={inputStyle} value={form.sensor_type}
                  onChange={e => {
                    const t = SENSOR_TYPES.find(s => s.id === e.target.value);
                    setForm({ ...form, sensor_type: e.target.value, unit: t?.unit || form.unit });
                  }}>
                  {SENSOR_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Unit</label>
                <input style={inputStyle} value={form.unit} placeholder="°F, %, PSI..."
                  onChange={e => setForm({ ...form, unit: e.target.value })} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Location</label>
              <input style={inputStyle} value={form.location} placeholder="e.g. Basement, Kitchen, Boiler Room"
                onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Property</label>
              {properties.length > 0 ? (
                <select style={inputStyle} value={form.property_id}
                  onChange={e => setForm({ ...form, property_id: e.target.value })}>
                  <option value="">Select property…</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
              ) : (
                <input style={inputStyle} value={form.property_address} placeholder="Property address"
                  onChange={e => setForm({ ...form, property_address: e.target.value })} />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Warning Threshold</label>
                <input style={inputStyle} type="number" value={form.threshold_warning} placeholder={`e.g. 80 ${form.unit}`}
                  onChange={e => setForm({ ...form, threshold_warning: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Critical Threshold</label>
                <input style={inputStyle} type="number" value={form.threshold_critical} placeholder={`e.g. 95 ${form.unit}`}
                  onChange={e => setForm({ ...form, threshold_critical: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addSensor} disabled={saving} style={{ ...btn.primary }}>
                {saving ? 'Adding…' : 'Add Sensor'}
              </button>
              <button onClick={() => { setShowAddSensor(false); setError(''); }} style={{ ...btn.ghost }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
