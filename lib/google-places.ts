import type { Lead } from "@/types/lead";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = "https://places.googleapis.com/v1/places:searchText";

interface PlacesTextSearchResponse {
  places?: GooglePlace[];
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
}

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export async function searchVenues(
  area: string,
  venueType: string = "bar",
  limit: number = 3,
  isLondon: boolean = true
): Promise<Lead[]> {
  if (!API_KEY) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured");
  }

  const query = isLondon
    ? `${venueType} in ${area}, London, UK`
    : `${venueType} in ${area}, UK`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(BASE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount,places.priceLevel,places.types",
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: Math.min(Math.max(limit, 1), 20),
        languageCode: "en",
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Places API error: ${response.status} - ${error}`);
  }

  const data: PlacesTextSearchResponse = await response.json();
  if (!data.places) return [];

  const now = new Date().toISOString();

  return data.places.map((place) => ({
    placeId: place.id,
    name: place.displayName?.text ?? "Unknown",
    address: place.formattedAddress ?? "",
    area,
    phone: place.nationalPhoneNumber,
    website: place.websiteUri,
    googleMapsUrl: place.googleMapsUri,
    rating: place.rating,
    reviewCount: place.userRatingCount,
    priceLevel: place.priceLevel
      ? PRICE_LEVEL_MAP[place.priceLevel] ?? 2
      : undefined,
    types: place.types ?? [],
    status: "new" as const,
    confidenceLevel: "low" as const,
    source: "google_places" as const,
    createdAt: now,
    updatedAt: now,
  }));
}
