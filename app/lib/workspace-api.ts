import { supabase } from './supabase';
export async function workspaceApi(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in again.');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, headers });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch {
    throw new Error(response.status === 413 ? 'This file is too large. Use a lease under 10 MB.' : 'The service returned an unexpected response. Your draft is safe; please retry.');
  }
  if (!response.ok) throw new Error(data.error || 'Unable to save. Please try again.');
  return data;
}

// Compatibility helper for callers that inspect Response bodies themselves.
export async function workspaceFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in again.');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  if (path === '/api/send-email' && typeof options.body === 'string') {
    const body = JSON.parse(options.body);
    // Stable for a retry of the same approved content, isolated by the server's actor ID.
    const bytes = new TextEncoder().encode(options.body);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    body.request_id ||= Array.from(new Uint8Array(hash), x=>x.toString(16).padStart(2,'0')).join('');
    options = {...options,body:JSON.stringify(body)};
  }
  const response = await fetch(path, { ...options, headers });
  if (path === '/api/send-email' && !response.ok) {
    const data = await response.clone().json();
    throw new Error(data.error || 'Message delivery is unconfirmed.');
  }
  return response;
}
