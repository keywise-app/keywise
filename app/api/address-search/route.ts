export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  if (!query || query.length < 3) return Response.json({ suggestions: [] });

  const token = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  console.log('Mapbox token available:', !!token);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=address&country=US&limit=5`;
  const res = await fetch(url);
  console.log('Mapbox response status:', res.status);
  const data = await res.json();
  console.log('Features count:', data.features?.length);
  const suggestions = data.features?.map((f: any) => f.place_name) || [];
  return Response.json({ suggestions });
}
