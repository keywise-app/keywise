// lib/agent-tools/context/tools.ts
// Reads the CMO context document at runtime (not bundled — edits take effect immediately).

import type { AgentTool } from "@/agents-framework/types";
import * as fs from "fs";
import * as path from "path";

const CONTEXT_PATH = path.join(process.cwd(), "lib", "agents", "cmo", "context.md");

export const contextReadTool: AgentTool<{}> = {
  name: "context_read",
  description:
    "Read the Keywise CMO context document — ICP, voice, positioning, past learnings, what to avoid. Call this ONCE at the start of every run before doing substantive work.",
  inputSchema: { type: "object", properties: {} },
  defaultAuthority: "auto",
  describeAction: () => "Read CMO context document",
  execute: async () => {
    try {
      const content = fs.readFileSync(CONTEXT_PATH, "utf-8");
      return { content, chars: content.length };
    } catch (err: any) {
      return { content: "", error: "Could not read context file: " + (err?.message || err) };
    }
  },
};

export const allContextTools = [contextReadTool];
