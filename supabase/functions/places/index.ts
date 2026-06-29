// Places proxy — keeps the Google Maps key server-side.
// Three actions over POST:
//   { action: 'autocomplete', input, sessionToken, near?, languageCode?, regionCode? } -> suggestions[]
//   { action: 'details', placeId, sessionToken }                                       -> { latitude, longitude, label, ... }
//   { action: 'nearby', category, near, languageCode? }                                -> places[]   (category chips)
// Uses the Places API (New). Set the GOOGLE_PLACES_API_KEY function secret:
//   supabase secrets set GOOGLE_PLACES_API_KEY=<key>
//
// Billing note: `autocomplete` + `details` are grouped into one billable session
// via the session token. `nearby` (Nearby Search) is a SEPARATE per-request SKU
// and is NOT covered by the session token — guard its volume with a Cloud
// billing budget alert.

const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

// Bias radius for autocomplete (soft — still allows distant matches). Tighter
// than before so nearby results are favoured for short/ambiguous queries.
const BIAS_RADIUS_M = 25000; // 25 km
// Hard restriction radius for category chips (Nearby Search needs a restriction).
const NEARBY_RADIUS_M = 8000; // 8 km

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface LatLng {
  latitude: number;
  longitude: number;
}

interface AutocompleteBody {
  action: 'autocomplete';
  input: string;
  sessionToken: string;
  near?: LatLng | null;
  languageCode?: string | null;
  regionCode?: string | null;
}

interface DetailsBody {
  action: 'details';
  placeId: string;
  sessionToken: string;
}

interface NearbyBody {
  action: 'nearby';
  category: string; // a Places primary type, e.g. "restaurant"
  near?: LatLng | null;
  languageCode?: string | null;
}

type Body = AutocompleteBody | DetailsBody | NearbyBody;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function handleAutocomplete(body: AutocompleteBody): Promise<Response> {
  const input = body.input?.trim();
  if (!input || input.length < 2) return json({ suggestions: [] });

  const requestBody: Record<string, unknown> = {
    input,
    sessionToken: body.sessionToken,
  };
  if (body.languageCode) requestBody.languageCode = body.languageCode;
  if (body.regionCode) requestBody.regionCode = body.regionCode;
  if (body.near) {
    requestBody.locationBias = {
      circle: {
        center: { latitude: body.near.latitude, longitude: body.near.longitude },
        radius: BIAS_RADIUS_M, // bias, not a hard restriction
      },
    };
    // `origin` makes Google return distanceMeters per prediction, enabling
    // distance labels and client-side re-ranking. Free — no extra SKU.
    requestBody.origin = { latitude: body.near.latitude, longitude: body.near.longitude };
  }

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY!,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: 'autocomplete_failed', detail }, 502);
  }

  const data = await res.json();
  const suggestions = (data.suggestions ?? [])
    .map((s: Record<string, any>) => s.placePrediction)
    .filter(Boolean)
    .map((p: Record<string, any>) => ({
      placeId: p.placeId,
      primaryText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
      distanceMeters: typeof p.distanceMeters === 'number' ? p.distanceMeters : null,
      types: Array.isArray(p.types) ? p.types : [],
    }));

  return json({ suggestions });
}

async function handleDetails(body: DetailsBody): Promise<Response> {
  if (!body.placeId) return json({ error: 'missing_place_id' }, 400);

  const url =
    `https://places.googleapis.com/v1/places/${encodeURIComponent(body.placeId)}` +
    `?sessionToken=${encodeURIComponent(body.sessionToken)}`;

  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_KEY!,
      // displayName already places this call in the Pro tier; `types` adds no tier cost.
      'X-Goog-FieldMask': 'id,location,formattedAddress,displayName,types',
    },
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: 'details_failed', detail }, 502);
  }

  const data = await res.json();
  const latitude = data.location?.latitude;
  const longitude = data.location?.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return json({ error: 'no_location' }, 502);
  }
  const label = data.displayName?.text ?? data.formattedAddress ?? `${latitude}, ${longitude}`;

  return json({
    latitude,
    longitude,
    label,
    address: data.formattedAddress ?? null,
    types: Array.isArray(data.types) ? data.types : [],
  });
}

async function handleNearby(body: NearbyBody): Promise<Response> {
  const category = body.category?.trim();
  if (!category) return json({ error: 'missing_category' }, 400);
  if (!body.near) return json({ error: 'missing_location' }, 400);

  const requestBody: Record<string, unknown> = {
    includedPrimaryTypes: [category],
    maxResultCount: 15,
    rankPreference: 'DISTANCE',
    locationRestriction: {
      circle: {
        center: { latitude: body.near.latitude, longitude: body.near.longitude },
        radius: NEARBY_RADIUS_M,
      },
    },
  };
  if (body.languageCode) requestBody.languageCode = body.languageCode;

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY!,
      'X-Goog-FieldMask':
        'places.id,places.location,places.displayName,places.formattedAddress,places.types',
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: 'nearby_failed', detail }, 502);
  }

  const data = await res.json();
  const places = (data.places ?? [])
    .filter((p: Record<string, any>) => typeof p.location?.latitude === 'number')
    .map((p: Record<string, any>) => ({
      placeId: p.id,
      primaryText: p.displayName?.text ?? '',
      secondaryText: p.formattedAddress ?? '',
      latitude: p.location.latitude,
      longitude: p.location.longitude,
      types: Array.isArray(p.types) ? p.types : [],
    }));

  return json({ places });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  if (!GOOGLE_KEY) {
    return json({ error: 'server_misconfigured', detail: 'GOOGLE_PLACES_API_KEY not set' }, 500);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  try {
    if (body.action === 'autocomplete') return await handleAutocomplete(body);
    if (body.action === 'details') return await handleDetails(body);
    if (body.action === 'nearby') return await handleNearby(body);
    return json({ error: 'unknown_action' }, 400);
  } catch (err) {
    return json({ error: 'unexpected', detail: String(err) }, 500);
  }
});
