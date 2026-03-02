const PLACES_BASE = "https://places.googleapis.com/v1/places";

// ── In-memory cache for Place Details (1-hour TTL) ──────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const placeDetailsCache = new Map<string, { data: PlaceDetails; expiresAt: number }>();

function getCached(placeId: string): PlaceDetails | null {
  const entry = placeDetailsCache.get(placeId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    placeDetailsCache.delete(placeId);
    return null;
  }
  return entry.data;
}

function setCache(placeId: string, data: PlaceDetails): void {
  placeDetailsCache.set(placeId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export interface PlaceReview {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  category: string | null;
  types: string[];
  hours: string[] | null;
  reviews: PlaceReview[] | null;
  description: string | null;
  photos: string[];
  googleMapsUrl: string | null;
  priceLevel: string | null;
}

interface PlaceDisplayName {
  text: string;
  languageCode?: string;
}

interface PlaceAuthorAttribution {
  displayName: string;
  uri?: string;
}

interface PlaceReviewRaw {
  authorAttribution?: PlaceAuthorAttribution;
  rating?: number;
  text?: { text: string };
  relativePublishTimeDescription?: string;
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  // Check cache first — avoids redundant API calls
  const cached = getCached(placeId);
  if (cached) {
    console.log(`[maps] Cache HIT for placeId: ${placeId}`);
    return cached;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY not configured");
  }

  const fieldMask = [
    "id",
    "displayName",
    "formattedAddress",
    "internationalPhoneNumber",
    "rating",
    "userRatingCount",
    "types",
    "regularOpeningHours",
    "reviews",
    "editorialSummary",
    "primaryTypeDisplayName",
    "photos",
    "googleMapsUri",
    "priceLevel",
  ].join(",");

  console.log(`[maps] API fetch for placeId: ${placeId}`);
  const res = await fetch(`${PLACES_BASE}/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[maps] API Error for ${placeId}:`, errText);
    throw new Error(`Places Details API failed: ${errText}`);
  }

  const data = await res.json();

  const photoUrls: string[] = (
    (data.photos as { name: string }[] | undefined) ?? []
  )
    .slice(0, 5)
    .map(
      (p) =>
        `https://places.googleapis.com/v1/${p.name}/media?key=${apiKey}&maxWidthPx=800`
    );

  const reviews: PlaceReview[] = (
    (data.reviews as PlaceReviewRaw[] | undefined) ?? []
  )
    .slice(0, 5)
    .map((r) => ({
      author: r.authorAttribution?.displayName ?? "Anonymous",
      rating: r.rating ?? 0,
      text: r.text?.text ?? "",
      relativeTime: r.relativePublishTimeDescription ?? "",
    }));

  const result: PlaceDetails = {
    placeId,
    name: (data.displayName as PlaceDisplayName | undefined)?.text ?? "Unknown",
    address: (data.formattedAddress as string | undefined) ?? null,
    phone: (data.internationalPhoneNumber as string | undefined) ?? null,
    rating: (data.rating as number | undefined) ?? null,
    reviewCount: (data.userRatingCount as number | undefined) ?? null,
    category:
      (data.primaryTypeDisplayName as PlaceDisplayName | undefined)?.text ??
      null,
    types: (data.types as string[] | undefined) ?? [],
    hours:
      (
        data.regularOpeningHours as
        | { weekdayDescriptions?: string[] }
        | undefined
      )?.weekdayDescriptions ?? null,
    reviews: reviews.length > 0 ? reviews : null,
    description:
      (data.editorialSummary as PlaceDisplayName | undefined)?.text ?? null,
    photos: photoUrls,
    googleMapsUrl: (data.googleMapsUri as string | undefined) ?? null,
    priceLevel: (data.priceLevel as string | undefined) ?? null,
  };

  // Store in cache
  setCache(placeId, result);
  return result;
}
