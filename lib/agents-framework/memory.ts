// src/framework/memory.ts
import type { MemoryStore } from "./types";

export function createMemoryStore(supabase: any, role: string): MemoryStore {
  return {
    async get(key) {
      const { data } = await supabase
        .from("agent_memory")
        .select("value")
        .eq("role", role)
        .eq("key", key)
        .maybeSingle();
      return data?.value ?? null;
    },
    async set(key, value, importance = 1) {
      await supabase
        .from("agent_memory")
        .upsert(
          { role, key, value, importance, updated_at: new Date().toISOString() },
          { onConflict: "role,key" }
        );
    },
    async list(prefix) {
      const { data } = await supabase
        .from("agent_memory")
        .select("key, value")
        .eq("role", role)
        .like("key", `${prefix}%`)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  };
}
