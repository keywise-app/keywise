import { workspaceAccess, apiError } from '@/lib/workspace/access';
// Return URLs are untrusted. Settlement comes exclusively from signed provider events.
export async function POST(req: Request) {
  try {
    await workspaceAccess(req);
    throw new Response('A browser redirect cannot confirm payment. Wait for provider confirmation or record an offline receipt in the rent ledger.',{status:409});
  } catch(error) {return apiError(error);}
}
