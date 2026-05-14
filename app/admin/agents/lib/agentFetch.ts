// app/admin/agents/lib/agentFetch.ts
//
// Tiny wrapper that attaches the admin's Supabase access token as a Bearer
// header before hitting an /api/agents/* endpoint. The server gate
// (requireAdminApi) reads this header.

import { supabase } from "@/app/lib/supabase";

export async function agentFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
