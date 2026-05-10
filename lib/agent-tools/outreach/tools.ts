// src/tools/outreach/tools.ts
// Find sites linking to competitors but not us, draft outreach emails.

import type { AgentTool } from "@/agents-framework/types";

interface Prospect {
  domain: string;
  url: string;
  topicalRelevance: number;
  domainAuthority?: number;
  linksToCompetitors: string[];
  pitchAngle: string;
}

// In production: integrate with Ahrefs/SEMrush API or use a cheaper alternative.
async function findBacklinkGaps(
  competitors: string[],
  _ourDomain: string
): Promise<Prospect[]> {
  // TODO: real backlink gap analysis. Out of scope for MVP — agent works on
  // the prospects table you (or the seeder) populate.
  return [
    {
      domain: "biggerpockets.com",
      url: "https://www.biggerpockets.com/blog/best-property-management-software-small-landlord",
      topicalRelevance: 0.92,
      domainAuthority: 78,
      linksToCompetitors: competitors.slice(0, 2),
      pitchAngle:
        "Their roundup is from 2024 and missing AI-native tools. Pitch: free Pro account + a write-up of how an independent landlord uses Keywise to manage 4 units in 15 min/week.",
    },
  ];
}

export const findBacklinkProspectsTool: AgentTool<{
  competitors: string[];
  maxResults?: number;
}> = {
  name: "outreach_find_prospects",
  description:
    "Identify sites that link to competitors but not Keywise. Inserts new prospects into backlink_prospects.",
  inputSchema: {
    type: "object",
    properties: {
      competitors: { type: "array", items: { type: "string" } },
      maxResults: { type: "number" },
    },
    required: ["competitors"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Find backlink prospects vs ${i.competitors.length} competitors`,
  execute: async (i, ctx) => {
    const prospects = await findBacklinkGaps(i.competitors, "keywise.app");
    const limited = prospects.slice(0, i.maxResults ?? 20);
    const rows = limited.map((p) => ({
      domain: p.domain,
      url: p.url,
      topical_relevance: p.topicalRelevance,
      domain_authority: p.domainAuthority,
      links_to_competitors: p.linksToCompetitors,
      pitch_angle: p.pitchAngle,
    }));
    await ctx.supabase
      .from("backlink_prospects")
      .upsert(rows, { onConflict: "url", ignoreDuplicates: true });
    return { found: rows.length };
  },
};

export const draftOutreachTool: AgentTool<{
  prospectId: string;
  subject: string;
  body: string;
  reasoning: string;
}> = {
  name: "outreach_draft_email",
  description:
    "Draft an outreach email to a backlink prospect. Always saves as a draft for Chris to review and send manually. Keep emails: <120 words, specific to their content, lead with what we offer them (not what we want), no templates.",
  inputSchema: {
    type: "object",
    properties: {
      prospectId: { type: "string" },
      subject: { type: "string", description: "≤60 chars; specific, not generic" },
      body: { type: "string" },
      reasoning: { type: "string" },
    },
    required: ["prospectId", "subject", "body", "reasoning"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Draft outreach for prospect ${i.prospectId}: "${i.subject}"`,
  execute: async (i, ctx) => {
    const { data, error } = await ctx.supabase
      .from("outreach_drafts")
      .insert({
        prospect_id: i.prospectId,
        subject: i.subject,
        body: i.body,
      })
      .select("id")
      .single();
    if (error) throw error;
    await ctx.supabase
      .from("backlink_prospects")
      .update({ status: "drafted" })
      .eq("id", i.prospectId);
    return { draftId: data.id };
  },
};

export const allOutreachTools = [findBacklinkProspectsTool, draftOutreachTool];
