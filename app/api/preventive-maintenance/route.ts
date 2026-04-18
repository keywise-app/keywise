import { NextResponse } from 'next/server';
import { checkAiLimit } from '../../lib/aiRateLimit';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { user_id, property_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

    const { allowed, reason } = await checkAiLimit(user_id, 'maintenance_assess');
    if (!allowed) return NextResponse.json({ error: 'rate_limit', message: reason }, { status: 429 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch sensors, recent readings, and maintenance history
    let sensorsQuery = supabase
      .from('iot_sensors')
      .select('*')
      .eq('user_id', user_id);
    if (property_id) sensorsQuery = sensorsQuery.eq('property_id', property_id);

    const { data: sensors } = await sensorsQuery;
    if (!sensors || sensors.length === 0) {
      return NextResponse.json({ error: 'no_sensors', message: 'No sensors found. Add IoT sensors to get preventive maintenance alerts.' });
    }

    const sensorIds = sensors.map(s => s.id);

    // Get latest readings for each sensor (last 48 hours)
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: readings } = await supabase
      .from('sensor_readings')
      .select('*')
      .in('sensor_id', sensorIds)
      .gte('recorded_at', cutoff)
      .order('recorded_at', { ascending: false })
      .limit(200);

    // Get maintenance history for context
    let maintQuery = supabase
      .from('maintenance')
      .select('issue, category, priority, status, property, cost, reported_date')
      .eq('user_id', user_id)
      .order('reported_date', { ascending: false })
      .limit(20);
    if (property_id) {
      const prop = sensors.find(s => s.property_id === property_id);
      if (prop?.property_address) {
        maintQuery = maintQuery.eq('property', prop.property_address);
      }
    }
    const { data: maintenance } = await maintQuery;

    // Build sensor summary for AI
    const sensorSummary = sensors.map(s => {
      const sensorReadings = (readings || []).filter(r => r.sensor_id === s.id);
      const latest = sensorReadings[0];
      const values = sensorReadings.map(r => r.value);
      const avg = values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null;
      const min = values.length ? Math.min(...values) : null;
      const max = values.length ? Math.max(...values) : null;

      return {
        name: s.name,
        type: s.sensor_type,
        location: s.location,
        property: s.property_address,
        status: s.status,
        latest_value: latest?.value ?? null,
        latest_unit: latest?.unit ?? s.unit,
        latest_time: latest?.recorded_at ?? null,
        avg_48h: avg !== null ? Math.round(avg * 10) / 10 : null,
        min_48h: min,
        max_48h: max,
        reading_count: values.length,
        thresholds: { warning: s.threshold_warning, critical: s.threshold_critical },
      };
    });

    const maintSummary = (maintenance || []).slice(0, 10).map(m =>
      `${m.category}: ${m.issue} (${m.priority}, ${m.status}${m.cost ? ', $' + m.cost : ''})`
    ).join('\n');

    const month = new Date().toLocaleString('default', { month: 'long' });
    const season = (() => {
      const m = new Date().getMonth();
      if (m >= 2 && m <= 4) return 'Spring';
      if (m >= 5 && m <= 7) return 'Summer';
      if (m >= 8 && m <= 10) return 'Fall';
      return 'Winter';
    })();

    const prompt = `You are an expert property maintenance AI analyzing IoT sensor data for preventive maintenance.

Current date: ${new Date().toISOString().split('T')[0]}
Season: ${season} (${month})

IoT Sensor Data (last 48 hours):
${JSON.stringify(sensorSummary, null, 2)}

Recent Maintenance History:
${maintSummary || 'No recent maintenance records'}

Analyze the sensor data and return ONLY valid JSON (no markdown):
{
  "overall_health": 85,
  "alerts": [
    {
      "severity": "critical|warning|info",
      "sensor_name": "sensor name",
      "title": "short alert title",
      "description": "what the data indicates and why it matters",
      "recommended_action": "specific action to take",
      "estimated_cost": "$100-200",
      "timeframe": "Immediate|Within 7 days|Within 30 days"
    }
  ],
  "predictions": [
    {
      "title": "predicted issue",
      "likelihood": "high|medium|low",
      "timeframe": "Next 7 days|Next 30 days|Next 90 days",
      "sensor": "related sensor",
      "reasoning": "why this is predicted based on data trends",
      "preventive_action": "what to do now to prevent it"
    }
  ],
  "sensor_health": [
    {
      "sensor_name": "name",
      "status": "normal|warning|critical|offline",
      "summary": "one-line status"
    }
  ],
  "seasonal_tips": ["relevant seasonal tip for property maintenance"]
}

Keep alerts to 1-5 items (only if data warrants them), predictions to 2-4, seasonal_tips to 2-3. Be specific to the actual sensor data. If readings are within normal range, reflect that — don't manufacture problems.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error?.type === 'rate_limit_error' || response.status === 429) {
        return NextResponse.json({ error: 'rate_limit', message: 'AI rate limit. Please wait and try again.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'ai_error', message: 'Failed to analyze sensor data.' }, { status: 500 });
    }

    const text = data.content[0].text;
    const cleaned = text.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: 'parse_error', message: 'Failed to parse AI analysis.' }, { status: 500 });
    }

    const analysis = JSON.parse(match[0]);

    // Store critical/warning alerts in the preventive_alerts table
    const alertsToStore = (analysis.alerts || [])
      .filter((a: any) => a.severity === 'critical' || a.severity === 'warning')
      .map((a: any) => ({
        user_id,
        property_id: property_id || sensors[0]?.property_id || null,
        sensor_name: a.sensor_name,
        severity: a.severity,
        title: a.title,
        description: a.description,
        recommended_action: a.recommended_action,
        estimated_cost: a.estimated_cost,
        timeframe: a.timeframe,
        status: 'active',
      }));

    if (alertsToStore.length > 0) {
      await supabase.from('preventive_alerts').insert(alertsToStore);
    }

    return NextResponse.json({ result: analysis, sensors_analyzed: sensors.length });
  } catch (err) {
    console.error('Preventive maintenance error:', err);
    return NextResponse.json({ error: 'server_error', message: 'Internal server error.' }, { status: 500 });
  }
}
