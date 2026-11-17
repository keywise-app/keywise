import { supabase } from './supabase';
export async function workspaceApi(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in again.');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to save. Please try again.');
  return data;
}
