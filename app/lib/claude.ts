export async function callClaude(prompt: string, retries = 1): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (data.error === 'rate_limit' && retries > 0) {
    await new Promise(resolve => setTimeout(resolve, 35000));
    return callClaude(prompt, retries - 1);
  }
  if (data.error === 'rate_limit') {
    return '';
  }
  return data.result || '';
}
