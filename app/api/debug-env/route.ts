export async function GET() {
  return Response.json({
    STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID?.slice(0, 25),
    STRIPE_SECRET_KEY_SET: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_SECRET_KEY_PREFIX: process.env.STRIPE_SECRET_KEY?.slice(0, 10),
  });
}
