// No persistence or delivery occurs until this module returns validated intelligence.
export type Intelligence = {
  summary: string;
  urgent: any[];
  opportunities: any[];
  trends: any[];
  competitor_updates: any[];
};

export class IntelligenceError extends Error {
  constructor(message: string, public retryable = false) { super(message); }
}

const fields = {
  urgent: ['title', 'description'],
  opportunities: ['title', 'description', 'source'],
  trends: ['title', 'description'],
  competitor_updates: ['competitor', 'update'],
} as const;
const nonempty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export function parseIntelligence(text: string): Intelligence {
  let value: any;
  try { value = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  catch { throw new IntelligenceError('invalid_json', true); }
  if (!value || !nonempty(value.summary) || value.summary.trim().length < 40 ||
      /no summary available|could not be parsed/i.test(value.summary)) {
    throw new IntelligenceError('invalid_summary', true);
  }
  for (const [key, required] of Object.entries(fields)) {
    if (!Array.isArray(value[key]) || value[key].some((item: any) =>
      !item || required.some(field => !nonempty(item[field])) ||
      Object.values(item).some(v => typeof v !== 'string') ||
      (item.priority && !['critical', 'high', 'medium', 'low'].includes(item.priority)))) {
      throw new IntelligenceError(`invalid_${key}`, true);
    }
  }
  if (!Object.keys(fields).some(key => value[key].length > 0)) {
    throw new IntelligenceError('empty_findings', true);
  }
  return value;
}

export async function generateIntelligence(prompt: string, apiKey: string, deps: {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
} = {}): Promise<Intelligence> {
  if (!apiKey) throw new IntelligenceError('missing_anthropic_key');
  const request = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const now = deps.now ?? Date.now;
  const deadline = now() + 85_000; // Reserve 35s of the existing 120s function budget for DB/email.
  let messages: any[] = [{ role: 'user', content: prompt }];
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let delay = 1000 * 2 ** (attempt - 1);
    try {
      const remaining = deadline - now();
      if (remaining <= 0) throw new IntelligenceError('generation_deadline');
      const response = await request('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: AbortSignal.timeout(Math.min(30_000, remaining)),
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }], messages }),
      });
      const retryAfter = response.headers.get('retry-after');
      if (retryAfter) {
        const seconds = Number(retryAfter);
        delay = Math.max(delay, Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - now());
      }
      const result = await response.json().catch(() => { throw new IntelligenceError('invalid_api_json', response.ok || [408, 409, 429].includes(response.status) || response.status >= 500); });
      // Log metadata only: never credentials, prompts, or raw report text.
      console.info('[intelligence] provider', { attempt, status: response.status,
        request_id: response.headers.get('request-id'), error_type: result?.error?.type,
        stop_reason: result?.stop_reason, blocks: result?.content?.map?.((c: any) => c.type) });
      if (!response.ok) throw new IntelligenceError(`anthropic_http_${response.status}:${result?.error?.type || 'unknown'}`,
        [408, 409, 429, 529].includes(response.status) || response.status >= 500);
      if (!Array.isArray(result.content)) throw new IntelligenceError('missing_content', true);
      const searchError = result.content.find((c: any) => c.type === 'web_search_tool_result' &&
        c.content?.type === 'web_search_tool_result_error');
      if (searchError) throw new IntelligenceError(`search_${searchError.content.error_code}`, true);
      if (result.stop_reason === 'pause_turn') {
        messages = [...messages, { role: 'assistant', content: result.content }];
        throw new IntelligenceError('paused_search', true);
      }
      if (result.stop_reason !== 'end_turn') throw new IntelligenceError(`incomplete_${result.stop_reason}`, true);
      const text = result.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
      return parseIntelligence(text);
    } catch (error) {
      lastError = error;
      const retryable = error instanceof IntelligenceError ? error.retryable :
        error instanceof TypeError || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name));
      console.error('[intelligence] generation failed', { attempt, reason: error instanceof IntelligenceError ? error.message : 'transport_error', retryable });
      if (!retryable || attempt === 3 || now() + delay >= deadline) throw error;
      await sleep(delay);
    }
  }
  throw lastError;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
