#!/usr/bin/env npx tsx
/**
 * Google OAuth Setup Script
 *
 * One-time interactive setup to get a refresh token for Google APIs.
 * Currently configured for Search Console; add scopes for Google Ads later.
 *
 * Prerequisites:
 *   1. Create a Google Cloud project at https://console.cloud.google.com
 *   2. Enable the "Search Console API"
 *   3. Create OAuth 2.0 credentials (Desktop app type)
 *   4. Download the JSON and save as .gcp-oauth-keys.json in the repo root
 *
 * Usage:
 *   npx tsx scripts/google-oauth-setup.ts
 */

import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const KEYS_FILE = path.join(process.cwd(), ".gcp-oauth-keys.json");
const REDIRECT_URI = "http://localhost";

const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly", // Search Console read
  // Add more scopes here when wiring Google Ads:
  // "https://www.googleapis.com/auth/adwords",
];

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  Google OAuth Setup for Keywise Agent Framework  ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // 1. Load credentials
  if (!fs.existsSync(KEYS_FILE)) {
    console.error(`❌ Missing ${KEYS_FILE}`);
    console.error("\nTo create it:");
    console.error("  1. Go to https://console.cloud.google.com/apis/credentials");
    console.error("  2. Create OAuth 2.0 Client ID (type: Desktop app)");
    console.error("  3. Download JSON → save as .gcp-oauth-keys.json in repo root");
    console.error("  4. Make sure .gcp-oauth-keys.json is in .gitignore\n");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(KEYS_FILE, "utf-8"));
  // Google's downloaded JSON wraps credentials under "installed" or "web"
  const creds = raw.installed || raw.web || raw;
  const clientId = creds.client_id;
  const clientSecret = creds.client_secret;

  if (!clientId || !clientSecret) {
    console.error("❌ Could not find client_id and client_secret in", KEYS_FILE);
    process.exit(1);
  }

  console.log("✓ Loaded credentials");
  console.log(`  Client ID: ${clientId.slice(0, 20)}...`);
  console.log(`  Scopes: ${SCOPES.join(", ")}\n`);

  // 2. Generate auth URL
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh token even if previously authorized
    scope: SCOPES,
  });

  console.log("═══════════════════════════════════════════════════");
  console.log("Step 1: Open this URL in your browser:\n");
  console.log(`  ${authUrl}\n`);
  console.log("Step 2: Sign in with cccolwell@gmail.com");
  console.log("Step 3: Approve access to Search Console");
  console.log("Step 4: You'll be redirected to http://localhost/...");
  console.log("        which will FAIL to load — that's expected.");
  console.log("Step 5: Copy the FULL URL from your browser's address bar.");
  console.log("═══════════════════════════════════════════════════\n");

  const pastedUrl = await prompt("Paste the full redirect URL here: ");

  // 3. Extract code from URL
  let code: string;
  try {
    const url = new URL(pastedUrl);
    code = url.searchParams.get("code") || "";
    if (!code) throw new Error("No 'code' parameter found");
  } catch {
    console.error("\n❌ Could not parse the URL. Make sure you copied the full URL including ?code=...");
    process.exit(1);
  }

  console.log("\n✓ Got authorization code");

  // 4. Exchange code for tokens
  let tokens: any;
  try {
    const { tokens: t } = await oauth2Client.getToken(code);
    tokens = t;
  } catch (err: any) {
    console.error("\n❌ Token exchange failed:", err?.message || err);
    console.error("  This usually means the code expired. Try again from the beginning.");
    process.exit(1);
  }

  if (!tokens.refresh_token) {
    console.error("\n❌ No refresh_token received. This can happen if you previously");
    console.error("   authorized this app. Revoke access at https://myaccount.google.com/permissions");
    console.error("   then run this script again.\n");
    process.exit(1);
  }

  console.log("\n✅ SUCCESS! Tokens received.\n");
  console.log("═══════════════════════════════════════════════════");
  console.log("Your refresh token (copy this — it won't be shown again):\n");
  console.log(`  ${tokens.refresh_token}\n`);
  console.log("═══════════════════════════════════════════════════\n");

  // 5. Print setup instructions
  console.log("Now add these to .env.local AND Vercel environment variables:\n");
  console.log(`  GOOGLE_SC_CLIENT_ID=${clientId}`);
  console.log(`  GOOGLE_SC_CLIENT_SECRET=${clientSecret}`);
  console.log(`  GOOGLE_SC_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`  GOOGLE_SC_SITE_URL=https://keywise.app/\n`);

  console.log("Quick copy-paste for .env.local:");
  console.log("────────────────────────────────");
  console.log(`GOOGLE_SC_CLIENT_ID=${clientId}`);
  console.log(`GOOGLE_SC_CLIENT_SECRET=${clientSecret}`);
  console.log(`GOOGLE_SC_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`GOOGLE_SC_SITE_URL=https://keywise.app/`);
  console.log("────────────────────────────────\n");

  console.log("Next steps:");
  console.log("  1. Add the 4 env vars above to .env.local");
  console.log("  2. Add them to Vercel: Settings → Environment Variables");
  console.log("  3. Replace the mock in lib/agent-tools/search-console/tools.ts");
  console.log("     with real googleapis calls using these credentials");
  console.log("  4. Deploy and run daily_audit — the CMO will pull live rank data\n");

  console.log("To add Google Ads later:");
  console.log("  1. Enable the Google Ads API in your GCP project");
  console.log('  2. Add "https://www.googleapis.com/auth/adwords" to SCOPES in this script');
  console.log("  3. Re-run this script to get a new refresh token with both scopes");
  console.log("  4. Replace the mock in lib/agent-tools/google-ads/client.ts\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
