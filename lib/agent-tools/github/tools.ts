// lib/agent-tools/github/tools.ts
// Read/write tools backed by the GitHub REST API.
// Auth: GITHUB_TOKEN env var (classic PAT with `repo` scope, or a fine-grained
// token scoped to keywise-app/keywise with Contents: read+write, Pull requests: read+write).

import type { AgentTool } from "@/agents-framework/types";
import { devConfig, isPathProtected } from "@/agents/dev/config";

const GH_API = "https://api.github.com";

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN env var is not set. Add a GitHub PAT with `repo` scope to Vercel env vars."
    );
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "keywise-dev-agent",
  };
}

const repoPath = `repos/${devConfig.owner}/${devConfig.repo}`;

async function ghJson(
  path: string,
  init: RequestInit = {}
): Promise<any> {
  const res = await fetch(`${GH_API}${path.startsWith("/") ? path : "/" + path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers as Record<string, string>),
    },
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      data?.message ||
      data?.errors?.map((e: any) => e.message).join("; ") ||
      `HTTP ${res.status}`;
    throw new Error(`GitHub ${res.status}: ${msg}`);
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────
// READ TOOLS
// ─────────────────────────────────────────────────────────────────

export const githubReadFileTool: AgentTool<{ path: string; ref?: string }> = {
  name: "github_read_file",
  description:
    "Read a file from the Keywise repo via GitHub's API. Returns text content + sha (you'll need the sha to write back to this path on the same branch). Use ref='main' (default) or a branch you created.",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Repo-relative path, e.g. app/components/FmvCalculator.tsx" },
      ref: { type: "string", description: "Branch or commit. Defaults to main." },
    },
    required: ["path"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Read ${i.path}${i.ref ? ` @ ${i.ref}` : ""}`,
  execute: async (i) => {
    const ref = i.ref || devConfig.baseBranch;
    const data = await ghJson(
      `/${repoPath}/contents/${encodeURIComponent(i.path)}?ref=${encodeURIComponent(ref)}`
    );
    if (Array.isArray(data)) {
      return { error: "Path is a directory, not a file. Use github_list_dir." };
    }
    if (data.type !== "file") {
      return { error: `Not a file (type=${data.type})` };
    }
    const content = Buffer.from(data.content, data.encoding || "base64").toString("utf-8");
    return {
      path: data.path,
      sha: data.sha,
      size: data.size,
      ref,
      content,
    };
  },
};

export const githubListDirTool: AgentTool<{ path: string; ref?: string }> = {
  name: "github_list_dir",
  description:
    "List the contents of a directory in the Keywise repo. Use this to discover files before reading.",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Repo-relative directory, e.g. app/components" },
      ref: { type: "string", description: "Branch. Defaults to main." },
    },
    required: ["path"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `List ${i.path}/`,
  execute: async (i) => {
    const ref = i.ref || devConfig.baseBranch;
    const data = await ghJson(
      `/${repoPath}/contents/${encodeURIComponent(i.path)}?ref=${encodeURIComponent(ref)}`
    );
    if (!Array.isArray(data)) {
      return { error: "Path is not a directory" };
    }
    return {
      path: i.path,
      ref,
      entries: data.map((d: any) => ({
        name: d.name,
        path: d.path,
        type: d.type, // 'file' | 'dir'
        size: d.size,
      })),
    };
  },
};

export const githubSearchCodeTool: AgentTool<{ query: string }> = {
  name: "github_search_code",
  description:
    "Search the Keywise repo for code matching a query. Useful when you don't know which file owns a route or component. Returns up to 20 matches with file paths.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          'Search expression (GitHub code-search syntax). Repo scope is added automatically. Example: "FmvCalculator extension:tsx"',
      },
    },
    required: ["query"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Search code: ${i.query}`,
  execute: async (i) => {
    const q = encodeURIComponent(`${i.query} repo:${devConfig.owner}/${devConfig.repo}`);
    const data = await ghJson(`/search/code?q=${q}&per_page=20`);
    return {
      total: data.total_count,
      results: (data.items || []).map((it: any) => ({
        path: it.path,
        name: it.name,
        url: it.html_url,
      })),
    };
  },
};

// ─────────────────────────────────────────────────────────────────
// WRITE TOOLS (branch + commit + PR)
// ─────────────────────────────────────────────────────────────────

export const githubCreateBranchTool: AgentTool<{ name: string }> = {
  name: "github_create_branch",
  description:
    "Create a new branch in the Keywise repo, based on main. Call this once at the start of your run. Branch names should look like cpo/proposal-<short-id>.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Branch name. Avoid spaces. Recommended: cpo/proposal-<id-prefix>",
      },
    },
    required: ["name"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Create branch ${i.name}`,
  execute: async (i) => {
    // 1. Get the main branch's HEAD sha
    const head = await ghJson(
      `/${repoPath}/git/ref/heads/${devConfig.baseBranch}`
    );
    const sha = head.object?.sha;
    if (!sha) throw new Error(`Could not resolve ${devConfig.baseBranch} sha`);

    // 2. Create the ref
    await ghJson(`/${repoPath}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${i.name}`, sha }),
    });

    return { branch: i.name, baseSha: sha };
  },
};

export const githubWriteFileTool: AgentTool<{
  path: string;
  content: string;
  branch: string;
  message: string;
  sha?: string;
}> = {
  name: "github_write_file",
  description:
    "Write a file on a branch. Creates or updates. For UPDATES, pass the file's current sha (from github_read_file). For new files, omit sha. Refuses to write paths in the guardrail list (see lib/agents/dev/config.ts).",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string", description: "Full file content (not a diff)" },
      branch: { type: "string" },
      message: { type: "string", description: "Commit message (one line)" },
      sha: {
        type: "string",
        description: "Current file sha if updating. Omit for new files.",
      },
    },
    required: ["path", "content", "branch", "message"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Write ${i.path} on ${i.branch}`,
  execute: async (i) => {
    // GUARDRAIL: refuse protected paths
    const check = isPathProtected(i.path);
    if (check.protected) {
      throw new Error(
        `Refusing to write ${i.path} — matches guardrail rule ${check.rule}. ` +
          `Stop and report status='agent_failed' if the proposal genuinely needs this file changed.`
      );
    }

    const body: any = {
      message: i.message,
      content: Buffer.from(i.content, "utf-8").toString("base64"),
      branch: i.branch,
    };
    if (i.sha) body.sha = i.sha;

    const data = await ghJson(
      `/${repoPath}/contents/${encodeURIComponent(i.path)}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    );
    return {
      path: i.path,
      commitSha: data.commit?.sha,
      newFileSha: data.content?.sha,
    };
  },
};

export const githubCreatePrTool: AgentTool<{
  title: string;
  body: string;
  head: string;
  draft?: boolean;
}> = {
  name: "github_create_pr",
  description:
    "Open a pull request from your branch into main. Title should be the proposal title (or a tight rewording). Body must quote the proposal description and list files touched.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      body: { type: "string", description: "Markdown PR body" },
      head: { type: "string", description: "Your branch name" },
      draft: {
        type: "boolean",
        description:
          "If true, open as draft (won't auto-merge). Use only if you're unsure about the change.",
      },
    },
    required: ["title", "body", "head"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Open PR: ${i.title} (head=${i.head})`,
  execute: async (i) => {
    const data = await ghJson(`/${repoPath}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title: i.title,
        body: i.body,
        head: i.head,
        base: devConfig.baseBranch,
        draft: !!i.draft,
      }),
    });
    return {
      number: data.number,
      url: data.html_url,
      state: data.state,
      headBranch: data.head?.ref,
    };
  },
};

export const githubMergePrTool: AgentTool<{
  number: number;
  method?: "merge" | "squash" | "rebase";
}> = {
  name: "github_merge_pr",
  description:
    "Merge an open PR. Defaults to squash. Used by the auto-merge flow AFTER preview screenshot is captured — typically not called by the Dev agent directly.",
  inputSchema: {
    type: "object",
    properties: {
      number: { type: "number" },
      method: { type: "string", enum: ["merge", "squash", "rebase"] },
    },
    required: ["number"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Merge PR #${i.number}`,
  execute: async (i) => {
    const data = await ghJson(`/${repoPath}/pulls/${i.number}/merge`, {
      method: "PUT",
      body: JSON.stringify({ merge_method: i.method ?? "squash" }),
    });
    return { merged: data.merged, sha: data.sha };
  },
};

// ─────────────────────────────────────────────────────────────────
// FINALIZATION TOOL — agent calls this once to report what it shipped.
// This is what updates the proposal_implementations row.
// ─────────────────────────────────────────────────────────────────

export const submitImplementationTool: AgentTool<{
  implementationId: string;
  branch: string;
  prNumber: number;
  prUrl: string;
  filesChanged: string[];
  diffSummary: string;
  reasoning: string;
}> = {
  name: "submit_implementation",
  description:
    "Final step. Call this ONCE at the end of your run to update the proposal_implementations row with the PR info. After this, the screenshot + auto-merge pipeline takes over. If you set status='agent_failed' before opening a PR, call report_failure instead.",
  inputSchema: {
    type: "object",
    properties: {
      implementationId: { type: "string", description: "Passed in your prompt." },
      branch: { type: "string" },
      prNumber: { type: "number" },
      prUrl: { type: "string" },
      filesChanged: { type: "array", items: { type: "string" } },
      diffSummary: {
        type: "string",
        description: 'e.g. "+42 / -18 lines across 3 files"',
      },
      reasoning: {
        type: "string",
        description: "One paragraph: what you changed and why.",
      },
    },
    required: [
      "implementationId",
      "branch",
      "prNumber",
      "prUrl",
      "filesChanged",
      "diffSummary",
      "reasoning",
    ],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Submit impl ${i.implementationId} → PR #${i.prNumber}`,
  execute: async (i, ctx) => {
    const { error } = await ctx.supabase
      .from("proposal_implementations")
      .update({
        status: "pr_open",
        branch: i.branch,
        pr_number: i.prNumber,
        pr_url: i.prUrl,
        files_changed: i.filesChanged,
        diff_summary: i.diffSummary,
        agent_reasoning: i.reasoning,
        agent_run_id: ctx.runId,
        pr_opened_at: new Date().toISOString(),
      })
      .eq("id", i.implementationId);
    if (error) throw error;
    return { ok: true, implementationId: i.implementationId };
  },
};

export const reportFailureTool: AgentTool<{
  implementationId: string;
  reason: string;
}> = {
  name: "report_failure",
  description:
    "Call this if you cannot complete the implementation safely (proposal requires guardrail file, ambiguous, needs a new dep, etc.). Sets status='agent_failed' with your reason on the dashboard.",
  inputSchema: {
    type: "object",
    properties: {
      implementationId: { type: "string" },
      reason: { type: "string", description: "Why you stopped. Be specific." },
    },
    required: ["implementationId", "reason"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Report failure on ${i.implementationId}: ${i.reason.slice(0, 60)}`,
  execute: async (i, ctx) => {
    const { error } = await ctx.supabase
      .from("proposal_implementations")
      .update({
        status: "agent_failed",
        error: i.reason,
        agent_run_id: ctx.runId,
      })
      .eq("id", i.implementationId);
    if (error) throw error;
    return { ok: true };
  },
};

// ─────────────────────────────────────────────────────────────────
// Dev-specific context_read — reads lib/agents/dev/context.md
// (The framework runner auto-loads it because the tool is named context_read.)
// ─────────────────────────────────────────────────────────────────

import * as fs from "fs";
import * as path from "path";

const DEV_CONTEXT_PATH = path.join(process.cwd(), "lib", "agents", "dev", "context.md");

export const devContextReadTool: AgentTool<{}> = {
  name: "context_read",
  description:
    "Read the Keywise Dev agent context document — codebase map, minimum-diff principle, guardrails, brand voice, end-of-run checklist. The framework also pre-loads this into your system prompt automatically.",
  inputSchema: { type: "object", properties: {} },
  defaultAuthority: "auto",
  describeAction: () => "Read Dev context document",
  execute: async () => {
    try {
      const content = fs.readFileSync(DEV_CONTEXT_PATH, "utf-8");
      return { content, chars: content.length };
    } catch (err: any) {
      return {
        content: "",
        error: "Could not read Dev context file: " + (err?.message || err),
      };
    }
  },
};

export const allGithubTools = [
  devContextReadTool,
  githubReadFileTool,
  githubListDirTool,
  githubSearchCodeTool,
  githubCreateBranchTool,
  githubWriteFileTool,
  githubCreatePrTool,
  githubMergePrTool,
  submitImplementationTool,
  reportFailureTool,
];
